/**
 * Seed the rate_cards and rates tables from CSV files in docs/rate_cards/.
 *
 * Usage:
 *   npx tsx scripts/seed-db.ts
 *
 * It will:
 *   1. Read "Rate Cards - New.csv" → upsert rate_cards (with tier discounts)
 *      Falls back to "Rate Cards.csv" if the new file is absent.
 *   2. Delete any codes no longer present in the catalog (cascades to rates).
 *   3. Read any other *.csv files in the same folder → upsert rates table
 *      (each file is matched to a card code by scanning its filename)
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseCsv } from 'csv-parse/sync';
import dotenv from 'dotenv';
import { eq, notInArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {
  rateCards,
  rateCardTerms,
  rates,
  tierThresholds,
  transitTimes,
} from '../src/lib/database/schema';

dotenv.config({ path: '.env.local' });

const DOCS_DIR = join(process.cwd(), 'docs', 'rate_cards');
const NEW_CATALOG_FILE = 'Rate Cards - New.csv';
const OLD_CATALOG_FILE = 'Rate Cards.csv';

// ─── Database connection ───────────────────────────────────────────────────

const client = postgres(process.env.DATABASE_URL!, {
  prepare: false,
  ssl: 'require',
});
const db = drizzle(client, { schema: { rateCards, rates } });

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Strip bullet/separator characters from product names and normalise whitespace. */
function cleanName(raw: string): string {
  // Replace any bullet-like chars (•, ·, ?, and Unicode replacement char)
  return raw.replace(/[•·�]/g, '·').trim();
}

/**
 * Extract origin country code from product name, e.g. "(VN)" → "VN".
 * Defaults to "VN" when no code is present.
 */
function extractSource(productName: string): string {
  const m = productName.match(/\(([A-Z]{2,3})\)\s*$/);
  return m ? m[1] : 'VN';
}

/** Parse a "1.5%" discount string → "1.50" numeric string, or null. */
function parseDiscount(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  const n = parseFloat(raw.replace('%', ''));
  return Number.isNaN(n) ? null : n.toFixed(2);
}

// ─── Parse Rate Cards catalog (new format) ────────────────────────────────

type CardRow = {
  code: string;
  productName: string;
  category: string | null;
  source: string;
  discountPublic: string | null;
  discountTier1: string | null;
  discountTier2: string | null;
  discountTier3: string | null;
  discountTier4: string | null;
  discountTier5: string | null;
  discountPt: string | null;
};

function parseNewCatalog(): CardRow[] {
  const filePath = join(DOCS_DIR, NEW_CATALOG_FILE);
  const content = readFileSync(filePath, 'utf-8');
  // Skip the first 3 rows (header + 2 threshold description rows)
  const rows = parseCsv(content, { skip_empty_lines: false }) as string[][];

  const cards: CardRow[] = [];
  for (const row of rows.slice(3)) {
    // Columns: Code, Product Name, Category, Public, T1, T2, T3, T4, T5, PT
    const [code, productName, category, pub, t1, t2, t3, t4, t5, pt] = row;
    if (!code?.trim() || !productName?.trim()) continue;

    const name = cleanName(productName);
    cards.push({
      code: code.trim(),
      productName: name,
      category: category?.trim() || null,
      source: extractSource(name),
      discountPublic: parseDiscount(pub),
      discountTier1: parseDiscount(t1),
      discountTier2: parseDiscount(t2),
      discountTier3: parseDiscount(t3),
      discountTier4: parseDiscount(t4),
      discountTier5: parseDiscount(t5),
      discountPt: pt?.trim() || null,
    });
  }
  return cards;
}

// ─── Parse Rate Cards catalog (old format, fallback) ──────────────────────

function parseOldCatalog() {
  const content = readFileSync(join(DOCS_DIR, OLD_CATALOG_FILE), 'utf-8');
  const rows = parseCsv(content, { skip_empty_lines: false }) as string[][];

  return rows
    .slice(1)
    .filter((row) => row[0]?.trim() && row[1]?.trim())
    .map(([code, productName, category, status, sourceFile]) => {
      const name = cleanName(productName);
      return {
        code: code.trim(),
        productName: name,
        category: category?.trim() || null,
        status: status?.trim() || 'Active',
        source: extractSource(name),
        sourceFile: sourceFile?.trim() || null,
        effectiveDate: (() => {
          const m = sourceFile?.match(/(\d{2})\.(\d{2})\.(\d{4})/);
          return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
        })(),
      };
    });
}

// ─── Parse a terms CSV file ────────────────────────────────────────────────

type TermEntry = { sectionNum: number; title: string; body: string };

/**
 * Extract numbered T&C sections from a row set that starts with a "Terms…"
 * header row (e.g. "Terms of Service:"). Used when terms are embedded in a
 * rates CSV after the rate data rather than in a dedicated file.
 */
function parseEmbeddedTerms(allRows: string[][]): TermEntry[] {
  const termsStartIdx = allRows.findIndex((row) => {
    const t = row[0]?.trim().toLowerCase() ?? '';
    return (
      t.startsWith('terms') ||
      t === 'note' ||
      t === 'note:' ||
      t.startsWith('notes')
    );
  });
  if (termsStartIdx === -1) return [];

  const sectionPattern = /^(\d+)\.\s*(.+)/;
  const entries: TermEntry[] = [];
  let current: { num: number; title: string; lines: string[] } | null = null;
  const preamble: string[] = [];
  // Track the last meaningful non-numbered line to detect sub-items.
  // A numbered item is a sub-item (not a real section) when its title starts
  // with "-" OR when the preceding context line ends with ":" (introducing a
  // list) or starts with "-"/"+" (already inside a bullet list).
  let contextLine: string | null = null;

  for (const row of allRows.slice(termsStartIdx)) {
    const text = row[0]?.trim() ?? '';
    const tl = text.toLowerCase();

    if (
      tl.startsWith('terms') ||
      tl === 'notes' ||
      tl === 'notes:' ||
      tl === 'note' ||
      tl === 'note:'
    )
      continue;

    if (!text) {
      if (current) {
        const cells = row
          .slice(1)
          .map((c) => c?.trim())
          .filter(Boolean);
        if (cells.length > 0) current.lines.push(cells.join('\t'));
      }
      continue;
    }

    const match = text.match(sectionPattern);
    if (match) {
      const title = match[2].trim();
      const isSubItem =
        title.startsWith('-') ||
        (contextLine !== null &&
          (contextLine.trimEnd().endsWith(':') ||
            contextLine.trimStart().startsWith('-') ||
            contextLine.trimStart().startsWith('+')));

      if (isSubItem) {
        // Treat as a body line, not a new section
        if (current) current.lines.push(text);
        else preamble.push(text);
        // contextLine intentionally NOT updated — keeps the list context alive
      } else {
        // Real top-level section
        if (preamble.length > 0 && entries.length === 0 && !current) {
          entries.push({
            sectionNum: 0,
            title: 'Notes',
            body: preamble.join('\n').trim(),
          });
        }
        if (current)
          entries.push({
            sectionNum: current.num,
            title: current.title,
            body: current.lines.join('\n').trim(),
          });
        current = { num: parseInt(match[1], 10), title, lines: [] };
        contextLine = null;
      }
    } else {
      contextLine = text;
      if (current) current.lines.push(text);
      else preamble.push(text);
    }
  }

  if (current) {
    entries.push({
      sectionNum: current.num,
      title: current.title,
      body: current.lines.join('\n').trim(),
    });
  } else if (preamble.length > 0 && entries.length === 0) {
    // No real sections found — entire notes block is one preamble
    entries.push({
      sectionNum: 0,
      title: 'Notes',
      body: preamble.join('\n').trim(),
    });
  }

  return entries;
}

function parseTermsCsv(filePath: string): TermEntry[] {
  const content = readFileSync(filePath, 'utf-8');
  const rows = parseCsv(content, {
    relax_column_count: true,
    skip_empty_lines: false,
  }) as string[][];

  const sectionPattern = /^(\d+)\.\s*(.+)/;
  const entries: TermEntry[] = [];
  let current: { num: number; title: string; lines: string[] } | null = null;

  for (const row of rows) {
    const text = row[0]?.trim() ?? '';

    if (text === 'Terms & Conditions') continue;

    if (!text) {
      // Row[0] is empty — multi-column row (e.g. zip code table). Capture as
      // tab-separated line so TermsSection can render it as a compact table.
      if (current) {
        const cells = row
          .slice(1)
          .map((c) => c?.trim())
          .filter(Boolean);
        if (cells.length > 0) current.lines.push(cells.join('\t'));
      }
      continue;
    }

    const match = text.match(sectionPattern);
    if (match) {
      if (current)
        entries.push({
          sectionNum: current.num,
          title: current.title,
          body: current.lines.join('\n').trim(),
        });
      current = {
        num: parseInt(match[1], 10),
        title: match[2].trim(),
        lines: [],
      };
    } else if (current) {
      current.lines.push(text);
    }
  }
  if (current)
    entries.push({
      sectionNum: current.num,
      title: current.title,
      body: current.lines.join('\n').trim(),
    });

  return entries;
}

// ─── Parse a transit times CSV file ───────────────────────────────────────

type TransitEntry = {
  countryName: string;
  countryCode: string | null;
  zoneCode: string | null;
  transitTimeMin: number | null;
  transitTimeMax: number | null;
  transitTimeRaw: string;
};

/** Parse "14 - 22", "7-15", "10-25" → { min, max } */
function parseTransitRange(raw: string): {
  min: number | null;
  max: number | null;
} {
  const m = raw.match(/(\d+)\s*-\s*(\d+)/);
  if (!m) return { min: null, max: null };
  return { min: parseInt(m[1], 10), max: parseInt(m[2], 10) };
}

function parseTransitTimesCsv(filePath: string): TransitEntry[] {
  const content = readFileSync(filePath, 'utf-8');
  const rows = parseCsv(content, {
    skip_empty_lines: false,
    relax_column_count: true,
  }) as string[][];

  // Find the header row: must have a "country/territory" column AND a "transit" column
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const lower = rows[i].map((c) => c?.toLowerCase().trim() ?? '');
    if (
      lower.some((h) => h.includes('country') || h.includes('territory')) &&
      lower.some((h) => h.includes('transit'))
    ) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return [];

  const headers = rows[headerIdx].map((c) => c?.toLowerCase().trim() ?? '');
  const colCountry = headers.findIndex(
    (h) => h.includes('country') || h.includes('territory'),
  );
  const colZone = headers.findIndex((h) => h.startsWith('zone'));
  // "country code" takes priority over bare "code" to avoid matching zone codes
  const colCode = (() => {
    const exact = headers.findIndex((h) => h.includes('country code'));
    return exact >= 0 ? exact : headers.indexOf('code');
  })();
  const colTransit = headers.findIndex((h) => h.includes('transit'));

  const entries: TransitEntry[] = [];
  for (const row of rows.slice(headerIdx + 1)) {
    const countryName = colCountry >= 0 ? row[colCountry]?.trim() : undefined;
    const countryCode = colCode >= 0 ? row[colCode]?.trim() || null : null;
    const zoneCode = colZone >= 0 ? row[colZone]?.trim() || null : null;
    const transitTimeRaw =
      colTransit >= 0 ? row[colTransit]?.trim() : undefined;

    if (!countryName || !transitTimeRaw) continue;

    const { min, max } = parseTransitRange(transitTimeRaw);
    entries.push({
      countryName,
      countryCode,
      zoneCode,
      transitTimeMin: min,
      transitTimeMax: max,
      transitTimeRaw,
    });
  }
  return entries;
}

// ─── Collect CSV files from root and one-level subdirectories ─────────────

type CsvFileEntry = {
  file: string;
  fullPath: string;
  cardCodeHint: string | null;
};

function collectCsvFiles(baseDir: string): CsvFileEntry[] {
  const results: CsvFileEntry[] = [];
  for (const name of readdirSync(baseDir)) {
    const fullPath = join(baseDir, name);
    const stat = statSync(fullPath);
    if (stat.isFile() && name.endsWith('.csv')) {
      results.push({ file: name, fullPath, cardCodeHint: null });
    } else if (stat.isDirectory()) {
      const hint = name.toUpperCase();
      for (const sub of readdirSync(fullPath)) {
        if (sub.endsWith('.csv')) {
          results.push({
            file: sub,
            fullPath: join(fullPath, sub),
            cardCodeHint: hint,
          });
        }
      }
    }
  }
  return results;
}

// ─── Parse a rates CSV file ────────────────────────────────────────────────

type RateEntry = {
  destination: string;
  zoneCode: string | null;
  weightKg: string;
  unit: string;
  price: string | null;
};

/** Shorten a section label for use as a destination prefix.
 *  "Express Saver Document Rates" → "Document"
 *  "Express Saver Package Rates"  → "Package"
 */
function extractRateLabel(label: string): string {
  const noSuffix = label.replace(/\s*rates?\s*$/i, '').trim();
  const parts = noSuffix.split(/\s+/);
  return parts[parts.length - 1] || noSuffix;
}

function parseRatesCsv(filePath: string): {
  effectiveDate: string | null;
  entries: RateEntry[];
  termEntries: TermEntry[];
} {
  const content = readFileSync(filePath, 'utf-8');
  const allRows = parseCsv(content, {
    relax_column_count: true,
    skip_empty_lines: false,
  }) as string[][];

  // ── Effective date ────────────────────────────────────────────────────────
  let effectiveDate: string | null = null;
  for (const row of allRows) {
    const cell = row[0]?.trim() ?? '';
    const m = cell.match(/Effective[:\s]+from[:\s]+(\d{2})\/(\d{2})\/(\d{4})/i);
    if (m) {
      effectiveDate = `${m[3]}-${m[2]}-${m[1]}`;
      break;
    }
  }

  // ── Find ALL "Weight" header rows (files can have multiple rate tables) ───
  type HeaderInfo = { idx: number; weightColIdx: number; label: string | null };
  const allHeaders: HeaderInfo[] = [];

  for (let i = 0; i < allRows.length; i++) {
    const wIdx = allRows[i].findIndex((cell) =>
      cell?.toLowerCase().includes('weight'),
    );
    if (wIdx === -1) continue;

    // Look backwards for the nearest non-metadata label row
    let label: string | null = null;
    for (let j = i - 1; j >= 0; j--) {
      const t = allRows[j][0]?.trim() ?? '';
      if (!t) continue;
      if (/^[\d.,\s]+$/.test(t)) break; // numeric data row → stop
      if (
        /^(effective from|service code|hotline|address|www\.|weight)/i.test(t)
      )
        break;
      label = t;
      break;
    }
    allHeaders.push({ idx: i, weightColIdx: wIdx, label });
  }

  if (allHeaders.length === 0)
    throw new Error(`No "Weight" header row in ${filePath}`);

  // Multiple weight-header tables (e.g. USS) → prefix with table label
  const useTablePrefix = allHeaders.length > 1;

  // Stop before the terms/notes section (if embedded)
  const termsStartIdx = allRows.findIndex((row) => {
    const t = row[0]?.trim().toLowerCase() ?? '';
    return (
      t.startsWith('terms') ||
      t === 'note' ||
      t === 'note:' ||
      t.startsWith('notes')
    );
  });
  const dataEnd = termsStartIdx !== -1 ? termsStartIdx : allRows.length;

  const entries: RateEntry[] = [];

  for (let h = 0; h < allHeaders.length; h++) {
    const { idx: headerIdx, weightColIdx, label } = allHeaders[h];
    const nextHeaderStart = allHeaders[h + 1]?.idx ?? dataEnd;

    const headerRow = allRows[headerIdx];
    const destinations = headerRow
      .slice(weightColIdx + 1)
      .map((d) => d.replace(/\r?\n/g, ' / ').trim());

    const dataRegion = allRows.slice(headerIdx + 1, nextHeaderStart);

    const zoneRow = dataRegion.find(
      (row) => row[weightColIdx]?.trim() === 'Zone',
    );
    const zones = zoneRow
      ? zoneRow.slice(weightColIdx + 1).map((z) => z?.trim() || null)
      : [];

    // Detect sub-section labels within this table (e.g. "Document", "Non-Document")
    const hasSubSections = dataRegion.some((row) => {
      const wc = row[weightColIdx]?.trim() ?? '';
      return wc && wc !== 'Zone' && Number.isNaN(parseFloat(wc));
    });

    const tablePrefix =
      useTablePrefix && label ? `${extractRateLabel(label)} | ` : '';
    let currentSubLabel: string | null = null;

    for (const row of dataRegion) {
      const wc = row[weightColIdx]?.trim() ?? '';
      if (!wc || wc === 'Zone') continue;

      if (Number.isNaN(parseFloat(wc))) {
        // Sub-section label row (e.g. "Document", "Non-Document")
        currentSubLabel = wc;
        continue;
      }

      const weightKg = parseFloat(wc).toFixed(3);
      const subPrefix =
        hasSubSections && currentSubLabel ? `${currentSubLabel} | ` : '';

      for (let col = 0; col < destinations.length; col++) {
        const baseDest = destinations[col];
        if (!baseDest) continue;
        const destination = `${tablePrefix}${subPrefix}${baseDest}`;
        const rawPrice = row[weightColIdx + col + 1];
        const price =
          rawPrice && rawPrice.trim()
            ? parseFloat(rawPrice.replace(/,/g, '')).toFixed(4)
            : null;
        entries.push({
          destination,
          zoneCode: zones[col] ?? null,
          weightKg,
          unit: 'kg',
          price,
        });
      }
    }
  }

  return { effectiveDate, entries, termEntries: parseEmbeddedTerms(allRows) };
}

// ─── Parse AME-style rates CSV (country-as-rows, weight-as-columns) ────────
// Also extracts transit times embedded in the same file.

type AmeParseResult = {
  effectiveDate: string | null;
  entries: RateEntry[];
  transitEntries: TransitEntry[];
};

function parseAmeStyleRatesCsv(filePath: string): AmeParseResult {
  const content = readFileSync(filePath, 'utf-8');
  const allRows = parseCsv(content, {
    relax_column_count: true,
    skip_empty_lines: false,
  }) as string[][];

  let effectiveDate: string | null = null;
  for (const row of allRows) {
    const cell = row[0]?.trim() ?? '';
    const m = cell.match(/Effective[:\s]+from[:\s]+(\d{2})\/(\d{2})\/(\d{4})/i);
    if (m) {
      effectiveDate = `${m[3]}-${m[2]}-${m[1]}`;
      break;
    }
  }

  // Header row: Country, Code, Route, Transit time, 0.1, 0.2, ..., 2
  const headerIdx = allRows.findIndex(
    (row) => row[0]?.trim().toLowerCase() === 'country',
  );
  if (headerIdx === -1)
    throw new Error(`No "Country" header row in ${filePath}`);

  const headerRow = allRows[headerIdx];
  const weightCols = headerRow.slice(4).map((w) => parseFloat(w.trim()));

  const entries: RateEntry[] = [];
  const transitEntries: TransitEntry[] = [];

  for (const row of allRows.slice(headerIdx + 1)) {
    const countryName = row[0]?.trim();
    const countryCode = row[1]?.trim() || null;
    const route = row[2]?.trim() || null;
    const transitTimeRaw = row[3]?.trim();
    if (!countryName || !transitTimeRaw) continue;

    const { min, max } = parseTransitRange(transitTimeRaw);
    transitEntries.push({
      countryName,
      countryCode,
      zoneCode: route,
      transitTimeMin: min,
      transitTimeMax: max,
      transitTimeRaw,
    });

    for (let i = 0; i < weightCols.length; i++) {
      const weightKg = weightCols[i].toFixed(3);
      const rawPrice = row[4 + i];
      const price = rawPrice?.trim()
        ? parseFloat(rawPrice.replace(/,/g, '')).toFixed(4)
        : null;
      entries.push({
        destination: countryName,
        zoneCode: countryCode,
        weightKg,
        unit: 'kg',
        price,
      });
    }
  }

  return { effectiveDate, entries, transitEntries };
}

/** Peek at up to 20 rows to decide if this CSV uses AME format (Country as first header). */
function isAmeStyleCsv(filePath: string): boolean {
  const content = readFileSync(filePath, 'utf-8');
  const rows = parseCsv(content, {
    relax_column_count: true,
    skip_empty_lines: false,
    to: 20,
  }) as string[][];
  return rows.some((row) => row[0]?.trim().toLowerCase() === 'country');
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  // 1. Parse catalog — prefer new format, fall back to old
  const useNew = existsSync(join(DOCS_DIR, NEW_CATALOG_FILE));
  console.log(`Using catalog: ${useNew ? NEW_CATALOG_FILE : OLD_CATALOG_FILE}`);

  const cardData = useNew
    ? parseNewCatalog()
    : parseOldCatalog().map((c) => ({
        ...c,
        discountPublic: null,
        discountTier1: null,
        discountTier2: null,
        discountTier3: null,
        discountTier4: null,
        discountTier5: null,
        discountPt: null,
      }));

  // 2. Upsert rate cards
  console.log('\nSeeding rate_cards...');
  for (const card of cardData) {
    await db
      .insert(rateCards)
      .values(card)
      .onConflictDoUpdate({
        target: rateCards.code,
        set: {
          productName: card.productName,
          category: card.category,
          source: card.source,
          discountPublic: card.discountPublic,
          discountTier1: card.discountTier1,
          discountTier2: card.discountTier2,
          discountTier3: card.discountTier3,
          discountTier4: card.discountTier4,
          discountTier5: card.discountTier5,
          discountPt: card.discountPt,
        },
      });
    console.log(`  ✓ ${card.code}: ${card.productName}`);
  }
  console.log(`  → ${cardData.length} rate cards upserted.`);

  // 3. Delete cards no longer in the catalog (cascades to their rates)
  const activeCodes = cardData.map((c) => c.code);
  const deleted = await db
    .delete(rateCards)
    .where(notInArray(rateCards.code, activeCodes))
    .returning({ code: rateCards.code });
  if (deleted.length > 0) {
    console.log(
      `  ✗ Deleted ${deleted.length} removed card(s): ${deleted.map((d) => d.code).join(', ')}`,
    );
  }

  // 4. Seed rates from any rates CSV files present (root + subdirectories)
  const SKIP_FILES = new Set([NEW_CATALOG_FILE, OLD_CATALOG_FILE]);
  const allCsvFiles = collectCsvFiles(DOCS_DIR);
  const ratesFiles = allCsvFiles.filter(
    ({ file }) =>
      !SKIP_FILES.has(file) &&
      !file.toLowerCase().includes('transit') &&
      !file.toLowerCase().includes(' - terms'),
  );

  if (ratesFiles.length === 0) {
    console.log('\nNo rates CSV files found. Done.');
    await client.end();
    return;
  }

  console.log('');
  for (const { file, fullPath, cardCodeHint } of ratesFiles) {
    console.log(`Processing: ${file}`);

    const matchedCode = cardCodeHint
      ? activeCodes.find((c) => c.toUpperCase() === cardCodeHint)
      : activeCodes.find((code) =>
          file.toUpperCase().includes(code.toUpperCase()),
        );

    if (!matchedCode) {
      console.log(`  ⚠ Could not match to a card code — skipping.\n`);
      continue;
    }
    console.log(`  Matched to: ${matchedCode}`);

    const ameStyle = isAmeStyleCsv(fullPath);
    let effectiveDate: string | null;
    let entries: RateEntry[];
    let transitEntries: TransitEntry[];
    let embeddedTermEntries: TermEntry[] = [];

    try {
      if (ameStyle) {
        const parsed = parseAmeStyleRatesCsv(fullPath);
        effectiveDate = parsed.effectiveDate;
        entries = parsed.entries;
        transitEntries = parsed.transitEntries;
      } else {
        const parsed = parseRatesCsv(fullPath);
        effectiveDate = parsed.effectiveDate;
        entries = parsed.entries;
        transitEntries = [];
        embeddedTermEntries = parsed.termEntries;
      }
    } catch (err) {
      console.log(
        `  ⚠ Skipping (not a rates file): ${(err as Error).message}\n`,
      );
      continue;
    }

    console.log(
      `  ${entries.length} rate entries (effective: ${effectiveDate ?? 'unknown'})`,
    );

    if (effectiveDate) {
      await db
        .update(rateCards)
        .set({ effectiveDate })
        .where(eq(rateCards.code, matchedCode));
    }

    const BATCH = 100;
    let upserted = 0;
    for (let i = 0; i < entries.length; i += BATCH) {
      const batch = entries
        .slice(i, i + BATCH)
        .map((e) => ({ cardCode: matchedCode, ...e }));
      await db
        .insert(rates)
        .values(batch)
        .onConflictDoUpdate({
          target: [rates.cardCode, rates.destination, rates.weightKg],
          set: { price: rates.price, zoneCode: rates.zoneCode },
        });
      upserted += batch.length;
    }
    console.log(`  ✓ ${upserted} rates upserted for ${matchedCode}`);

    if (embeddedTermEntries.length > 0) {
      for (const entry of embeddedTermEntries) {
        await db
          .insert(rateCardTerms)
          .values({ cardCode: matchedCode, ...entry })
          .onConflictDoUpdate({
            target: [rateCardTerms.cardCode, rateCardTerms.sectionNum],
            set: { title: rateCardTerms.title, body: rateCardTerms.body },
          });
      }
      console.log(
        `  ✓ ${embeddedTermEntries.length} embedded terms upserted for ${matchedCode}`,
      );
    }

    if (transitEntries.length > 0) {
      let tUpserted = 0;
      for (let i = 0; i < transitEntries.length; i += BATCH) {
        const batch = transitEntries
          .slice(i, i + BATCH)
          .map((e) => ({ cardCode: matchedCode, ...e }));
        await db
          .insert(transitTimes)
          .values(batch)
          .onConflictDoUpdate({
            target: [transitTimes.cardCode, transitTimes.countryCode],
            set: {
              countryName: transitTimes.countryName,
              zoneCode: transitTimes.zoneCode,
              transitTimeMin: transitTimes.transitTimeMin,
              transitTimeMax: transitTimes.transitTimeMax,
              transitTimeRaw: transitTimes.transitTimeRaw,
            },
          });
        tUpserted += batch.length;
      }
      console.log(`  ✓ ${tUpserted} transit times upserted for ${matchedCode}`);
    }
    console.log('');
  }

  // 5. Upsert tier thresholds — thresholdMinVnd is the minimum monthly VND revenue.
  // NULL = public tier (no minimum). Display is derived in the UI from the numeric value.
  console.log('\nSeeding tier_thresholds...');
  const TIER_ROWS = [
    { tierKey: 'public', label: 'Public', thresholdMinVnd: null, sortOrder: 0 },
    {
      tierKey: 'tier1',
      label: 'T1',
      thresholdMinVnd: '20000000',
      sortOrder: 1,
    },
    {
      tierKey: 'tier2',
      label: 'T2',
      thresholdMinVnd: '30000000',
      sortOrder: 2,
    },
    {
      tierKey: 'tier3',
      label: 'T3',
      thresholdMinVnd: '40000000',
      sortOrder: 3,
    },
    {
      tierKey: 'tier4',
      label: 'T4',
      thresholdMinVnd: '70000000',
      sortOrder: 4,
    },
    {
      tierKey: 'tier5',
      label: 'T5',
      thresholdMinVnd: '120000000',
      sortOrder: 5,
    },
    { tierKey: 'pt', label: 'PT', thresholdMinVnd: '200000000', sortOrder: 6 },
  ];
  for (const row of TIER_ROWS) {
    await db
      .insert(tierThresholds)
      .values(row)
      .onConflictDoUpdate({
        target: tierThresholds.tierKey,
        set: {
          label: row.label,
          thresholdMinVnd: row.thresholdMinVnd,
          sortOrder: row.sortOrder,
        },
      });
  }
  console.log(`  → ${TIER_ROWS.length} tier thresholds upserted.`);

  // 6. Seed transit times from "*- Transit times.csv" files
  const transitFiles = allCsvFiles.filter(
    ({ file }) =>
      file.toLowerCase().includes('transit') && file.endsWith('.csv'),
  );

  if (transitFiles.length > 0) {
    console.log('\nSeeding transit_times...');
    for (const { file, fullPath, cardCodeHint } of transitFiles) {
      const matchedCode = cardCodeHint
        ? activeCodes.find((c) => c.toUpperCase() === cardCodeHint)
        : activeCodes.find((code) =>
            file.toUpperCase().startsWith(code.toUpperCase()),
          );
      if (!matchedCode) {
        console.log(`  ⚠ ${file}: could not match to a card code — skipping.`);
        continue;
      }
      console.log(`  Processing: ${file} → ${matchedCode}`);
      const rawEntries = parseTransitTimesCsv(fullPath);
      // Deduplicate by country_code — keep first occurrence per non-null code
      const seenCodes = new Set<string>();
      const entries = rawEntries.filter((e) => {
        if (!e.countryCode) return true;
        if (seenCodes.has(e.countryCode)) return false;
        seenCodes.add(e.countryCode);
        return true;
      });

      const BATCH = 100;
      let upserted = 0;
      for (let i = 0; i < entries.length; i += BATCH) {
        const batch = entries
          .slice(i, i + BATCH)
          .map((e) => ({ cardCode: matchedCode, ...e }));
        await db
          .insert(transitTimes)
          .values(batch)
          .onConflictDoUpdate({
            target: [transitTimes.cardCode, transitTimes.countryCode],
            set: {
              countryName: transitTimes.countryName,
              zoneCode: transitTimes.zoneCode,
              transitTimeMin: transitTimes.transitTimeMin,
              transitTimeMax: transitTimes.transitTimeMax,
              transitTimeRaw: transitTimes.transitTimeRaw,
            },
          });
        upserted += batch.length;
      }
      console.log(
        `  ✓ ${upserted} transit time entries upserted for ${matchedCode}`,
      );
    }
  }

  // 7. Seed terms from "* - Terms.csv" files
  const termsFiles = allCsvFiles.filter(
    ({ file }) =>
      file.toLowerCase().includes(' - terms') && file.endsWith('.csv'),
  );

  if (termsFiles.length > 0) {
    console.log('\nSeeding rate_card_terms...');
    for (const { file, fullPath, cardCodeHint } of termsFiles) {
      const matchedCode = cardCodeHint
        ? activeCodes.find((c) => c.toUpperCase() === cardCodeHint)
        : activeCodes.find((code) =>
            file.toUpperCase().startsWith(code.toUpperCase()),
          );
      if (!matchedCode) {
        console.log(`  ⚠ ${file}: could not match to a card code — skipping.`);
        continue;
      }
      console.log(`  Processing: ${file} → ${matchedCode}`);
      const entries = parseTermsCsv(fullPath);

      for (const entry of entries) {
        await db
          .insert(rateCardTerms)
          .values({ cardCode: matchedCode, ...entry })
          .onConflictDoUpdate({
            target: [rateCardTerms.cardCode, rateCardTerms.sectionNum],
            set: { title: rateCardTerms.title, body: rateCardTerms.body },
          });
      }
      console.log(
        `  ✓ ${entries.length} terms sections upserted for ${matchedCode}`,
      );
    }
  }

  await client.end();
  console.log('\nDone!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

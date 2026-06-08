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

import { parse as parseCsv } from 'csv-parse/sync';
import dotenv from 'dotenv';
import { eq, notInArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
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

    cards.push({
      code: code.trim(),
      productName: cleanName(productName),
      category: category?.trim() || null,
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
    .map(([code, productName, category, status, sourceFile]) => ({
      code: code.trim(),
      productName: cleanName(productName),
      category: category?.trim() || null,
      status: status?.trim() || 'Active',
      sourceFile: sourceFile?.trim() || null,
      effectiveDate: (() => {
        const m = sourceFile?.match(/(\d{2})\.(\d{2})\.(\d{4})/);
        return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
      })(),
    }));
}

// ─── Parse a terms CSV file ────────────────────────────────────────────────

type TermEntry = { sectionNum: number; title: string; body: string };

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
    if (!text || text === 'Terms & Conditions') continue;

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
    } else if (current && text) {
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
  const rows = parseCsv(content, { skip_empty_lines: false }) as string[][];

  const entries: TransitEntry[] = [];
  for (const row of rows.slice(2)) {
    // skip header rows (row 0 = title, row 1 = column names)
    const [countryName, countryCode, zoneCode, transitTimeRaw] = row;
    if (!countryName?.trim() || !transitTimeRaw?.trim()) continue;

    const { min, max } = parseTransitRange(transitTimeRaw.trim());
    entries.push({
      countryName: countryName.trim(),
      countryCode: countryCode?.trim() || null,
      zoneCode: zoneCode?.trim() || null,
      transitTimeMin: min,
      transitTimeMax: max,
      transitTimeRaw: transitTimeRaw.trim(),
    });
  }
  return entries;
}

// ─── Parse a rates CSV file ────────────────────────────────────────────────

type RateEntry = {
  destination: string;
  zoneCode: string | null;
  weightKg: string;
  unit: string;
  price: string | null;
};

function parseRatesCsv(filePath: string): {
  effectiveDate: string | null;
  entries: RateEntry[];
} {
  const content = readFileSync(filePath, 'utf-8');

  // csv-parse handles multi-line quoted values automatically
  const allRows = parseCsv(content, {
    relax_column_count: true,
    skip_empty_lines: false,
  }) as string[][];

  // ── Find effective date ──────────────────────────────────────────────────
  let effectiveDate: string | null = null;
  for (const row of allRows) {
    const cell = row[0]?.trim() ?? '';
    const m = cell.match(/Effective from:\s*(\d{2})\/(\d{2})\/(\d{4})/i);
    if (m) {
      effectiveDate = `${m[3]}-${m[2]}-${m[1]}`;
      break;
    }
  }

  // ── Find header row (first cell contains "Weight") ─────────────────────
  const headerIdx = allRows.findIndex((row) =>
    row[0]?.toLowerCase().includes('weight'),
  );
  if (headerIdx === -1)
    throw new Error(`No "Weight" header row in ${filePath}`);

  const headerRow = allRows[headerIdx];
  // Destination names — normalise newlines to " / " for clean DB storage
  const destinations = headerRow
    .slice(1)
    .map((d) => d.replace(/\r?\n/g, ' / ').trim());

  // ── Find zone row (first cell === "Zone") ────────────────────────────────
  const zoneRow = allRows
    .slice(headerIdx + 1)
    .find((row) => row[0]?.trim() === 'Zone');
  const zones = zoneRow ? zoneRow.slice(1).map((z) => z?.trim() || null) : [];

  // ── Data rows: numeric first cell ────────────────────────────────────────
  const dataRows = allRows.slice(headerIdx + 1).filter((row) => {
    const first = row[0]?.trim();
    return first && first !== 'Zone' && !Number.isNaN(parseFloat(first));
  });

  const entries: RateEntry[] = [];
  for (const row of dataRows) {
    const weightKg = parseFloat(row[0]).toFixed(3);

    for (let col = 0; col < destinations.length; col++) {
      const destination = destinations[col];
      if (!destination) continue;

      const rawPrice = row[col + 1];
      // Prices are formatted like "240,000" — strip commas, treat empty as null
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

  return { effectiveDate, entries };
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

  // 4. Seed rates from any rates CSV files present
  const SKIP_FILES = new Set([NEW_CATALOG_FILE, OLD_CATALOG_FILE]);
  const ratesFiles = readdirSync(DOCS_DIR).filter(
    (f) =>
      f.endsWith('.csv') &&
      !SKIP_FILES.has(f) &&
      !f.toLowerCase().includes('transit times'),
  );

  if (ratesFiles.length === 0) {
    console.log('\nNo rates CSV files found. Done.');
    await client.end();
    return;
  }

  console.log('');
  for (const file of ratesFiles) {
    console.log(`Processing: ${file}`);

    const matchedCode = activeCodes.find((code) =>
      file.toUpperCase().includes(code.toUpperCase()),
    );

    if (!matchedCode) {
      console.log(`  ⚠ Could not match to a card code — skipping.\n`);
      continue;
    }
    console.log(`  Matched to: ${matchedCode}`);

    const { effectiveDate, entries } = parseRatesCsv(join(DOCS_DIR, file));
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
    console.log(`  ✓ ${upserted} rates upserted for ${matchedCode}\n`);
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
  const transitFiles = readdirSync(DOCS_DIR).filter(
    (f) => f.toLowerCase().includes('transit times') && f.endsWith('.csv'),
  );

  if (transitFiles.length > 0) {
    console.log('\nSeeding transit_times...');
    for (const file of transitFiles) {
      // Extract card code from filename, e.g. "QSM - Transit times.csv" → "QSM"
      const matchedCode = activeCodes.find((code) =>
        file.toUpperCase().startsWith(code.toUpperCase()),
      );
      if (!matchedCode) {
        console.log(`  ⚠ ${file}: could not match to a card code — skipping.`);
        continue;
      }
      console.log(`  Processing: ${file} → ${matchedCode}`);
      const entries = parseTransitTimesCsv(join(DOCS_DIR, file));

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
  const termsFiles = readdirSync(DOCS_DIR).filter(
    (f) =>
      f.toLowerCase().includes('terms') &&
      f.endsWith('.csv') &&
      f.toLowerCase().includes(' - terms'),
  );

  if (termsFiles.length > 0) {
    console.log('\nSeeding rate_card_terms...');
    for (const file of termsFiles) {
      const matchedCode = activeCodes.find((code) =>
        file.toUpperCase().startsWith(code.toUpperCase()),
      );
      if (!matchedCode) {
        console.log(`  ⚠ ${file}: could not match to a card code — skipping.`);
        continue;
      }
      console.log(`  Processing: ${file} → ${matchedCode}`);
      const entries = parseTermsCsv(join(DOCS_DIR, file));

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

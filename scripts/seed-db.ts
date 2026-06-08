/**
 * Seed the rate_cards and rates tables from CSV files in docs/rate_cards/.
 *
 * Usage:
 *   npx tsx scripts/seed-db.ts
 *
 * It will:
 *   1. Read Rate Cards.csv → populate rate_cards table
 *   2. Read any other *.csv files in the same folder → populate rates table
 *      (each file is matched to a card code by scanning its filename)
 */

import { parse as parseCsv } from 'csv-parse/sync';
import dotenv from 'dotenv';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';
import { rateCards, rates } from '../src/lib/database/schema';

dotenv.config({ path: '.env.local' });

const DOCS_DIR = join(process.cwd(), 'docs', 'rate_cards');
const CATALOG_FILE = 'Rate Cards.csv';

// ─── Database connection ───────────────────────────────────────────────────

const client = postgres(process.env.DATABASE_URL!, {
  prepare: false,
  ssl: 'require',
});
const db = drizzle(client, { schema: { rateCards, rates } });

// ─── Parse Rate Cards catalog ──────────────────────────────────────────────

function parseRateCardsCatalog() {
  const content = readFileSync(join(DOCS_DIR, CATALOG_FILE), 'utf-8');
  const rows = parseCsv(content, { skip_empty_lines: false }) as string[][];

  const cards: {
    code: string;
    productName: string;
    category: string | null;
    status: string;
    sourceFile: string | null;
    effectiveDate: string | null;
  }[] = [];

  for (const row of rows.slice(1)) {
    const [code, productName, category, status, sourceFile] = row;
    // Skip section-header rows (empty product name)
    if (!code?.trim() || !productName?.trim()) continue;

    // Try to extract effective date from the source filename (DD.MM.YYYY)
    let effectiveDate: string | null = null;
    if (sourceFile) {
      const m = sourceFile.match(/(\d{2})\.(\d{2})\.(\d{4})/);
      if (m) effectiveDate = `${m[3]}-${m[2]}-${m[1]}`;
    }

    cards.push({
      code: code.trim(),
      productName: productName.trim(),
      category: category?.trim() || null,
      status: status?.trim() || 'Active',
      sourceFile: sourceFile?.trim() || null,
      effectiveDate,
    });
  }

  return cards;
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
  // 1. Seed rate cards catalog
  console.log('Seeding rate_cards...');
  const cardData = parseRateCardsCatalog();

  for (const card of cardData) {
    await db
      .insert(rateCards)
      .values(card)
      .onConflictDoUpdate({
        target: rateCards.code,
        set: {
          productName: card.productName,
          category: card.category,
          status: card.status,
          sourceFile: card.sourceFile,
          effectiveDate: card.effectiveDate,
        },
      });
    console.log(`  ✓ ${card.code}: ${card.productName}`);
  }
  console.log(`  → ${cardData.length} rate cards upserted.\n`);

  // 2. Seed rates from any rates CSV files present
  const ratesFiles = readdirSync(DOCS_DIR).filter(
    (f) => f.endsWith('.csv') && f !== CATALOG_FILE,
  );

  if (ratesFiles.length === 0) {
    console.log('No rates CSV files found. Done.');
    await client.end();
    return;
  }

  const knownCodes = cardData.map((c) => c.code);

  for (const file of ratesFiles) {
    console.log(`Processing: ${file}`);

    // Match file to a card code by scanning the filename
    const matchedCode = knownCodes.find((code) =>
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

    // Update effective date on the card if found in the rates file
    if (effectiveDate) {
      await db
        .update(rateCards)
        .set({ effectiveDate })
        .where(eq(rateCards.code, matchedCode));
    }

    // Batch-insert rates (100 rows at a time)
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

  await client.end();
  console.log('Done!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

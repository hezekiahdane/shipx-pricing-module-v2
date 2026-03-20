import { eq } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { getDb } from './client';

// biome-ignore lint/suspicious/noExplicitAny: Drizzle generic table type requires any
type AnyPgTable = PgTable<any>;

export class BaseRepository<
  TTable extends AnyPgTable,
  TRow = TTable['$inferSelect'],
  TInsert = TTable['$inferInsert'],
> {
  constructor(protected readonly table: TTable) {}

  async findAll(): Promise<TRow[]> {
    const db = getDb();
    // biome-ignore lint/suspicious/noExplicitAny: Drizzle type coercion
    const rows = await db.select().from(this.table as any);
    return rows as TRow[];
  }

  async create(data: TInsert): Promise<TRow> {
    const db = getDb();
    const rows = await db
      // biome-ignore lint/suspicious/noExplicitAny: Drizzle type coercion
      .insert(this.table as any)
      .values(data as Record<string, unknown>)
      .returning();
    return rows[0] as TRow;
  }

  async delete(id: string): Promise<void> {
    const db = getDb();
    // biome-ignore lint/suspicious/noExplicitAny: Drizzle type coercion
    const idColumn = (this.table as any).id;
    if (!idColumn) throw new Error('Table must have an "id" column');
    // biome-ignore lint/suspicious/noExplicitAny: Drizzle type coercion
    await (db.delete(this.table as any) as any).where(eq(idColumn, id));
  }
}

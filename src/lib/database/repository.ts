import { eq } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { getDb } from './client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPgTable = PgTable<any>;

export class BaseRepository<
  TTable extends AnyPgTable,
  TRow = TTable['$inferSelect'],
  TInsert = TTable['$inferInsert'],
> {
  constructor(protected readonly table: TTable) {}

  async findAll(): Promise<TRow[]> {
    const db = getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await db.select().from(this.table as any);
    return rows as TRow[];
  }

  async create(data: TInsert): Promise<TRow> {
    const db = getDb();
    const rows = await db
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(this.table as any)
      .values(data as Record<string, unknown>)
      .returning();
    return rows[0] as TRow;
  }

  async delete(id: string): Promise<void> {
    const db = getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const idColumn = (this.table as any)['id'];
    if (!idColumn) throw new Error('Table must have an "id" column');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db.delete(this.table as any) as any).where(eq(idColumn, id));
  }
}

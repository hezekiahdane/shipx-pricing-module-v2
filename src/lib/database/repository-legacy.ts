/**
 * Generic repository pattern for Supabase tables.
 *
 * Provides a consistent, typed interface for CRUD operations.
 * Business logic should depend on this interface, not the Supabase client directly.
 *
 * Usage — extend this class for each table:
 *
 *   import type { Database } from '@/types/database';
 *   type Profile = Database['public']['Tables']['profiles']['Row'];
 *
 *   class ProfileRepository extends BaseRepository<Profile> {
 *     constructor() { super('profiles'); }
 *
 *     async findByEmail(email: string): Promise<Profile | null> {
 *       const supabase = await createClient();
 *       const { data, error } = await supabase
 *         .from(this.table)
 *         .select('*')
 *         .eq('email', email)
 *         .single();
 *       if (error) throw error;
 *       return data;
 *     }
 *   }
 *
 * NOTE: Run `npm run db:types` after schema changes to regenerate database types.
 */

import { createClient } from '@/lib/supabase/server';

export class BaseRepository<TRow extends Record<string, unknown>> {
  constructor(protected readonly table: string) {}

  async findAll(): Promise<TRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from(this.table).select('*');
    if (error) throw error;
    return (data ?? []) as TRow[];
  }

  async findById(id: string): Promise<TRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(this.table)
      .select('*')
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return (data ?? null) as TRow | null;
  }

  async create(payload: Partial<TRow>): Promise<TRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(this.table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(payload as any)
      .select()
      .single();
    if (error) throw error;
    return data as TRow;
  }

  async update(id: string, payload: Partial<TRow>): Promise<TRow> {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from(this.table)
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as TRow;
  }

  async delete(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from(this.table).delete().eq('id', id);
    if (error) throw error;
  }
}

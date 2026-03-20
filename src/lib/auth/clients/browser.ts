/**
 * Supabase browser client — use in Client Components ('use client').
 *
 * Creates a singleton browser client that persists across re-renders.
 * Uses the public anon key; Row Level Security (RLS) policies control access.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

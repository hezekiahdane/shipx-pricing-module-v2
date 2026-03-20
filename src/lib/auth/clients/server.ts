/**
 * Supabase server client — use in Server Components, Route Handlers, and Server Actions.
 *
 * Reads and writes auth cookies to maintain the user's session on the server.
 * Uses the public anon key; RLS policies control data access.
 *
 * For admin operations that bypass RLS, use the service role key:
 *   const supabase = createClient({ useServiceRole: true });
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

interface CreateClientOptions {
  useServiceRole?: boolean;
}

export async function createClient(options: CreateClientOptions = {}) {
  const cookieStore = await cookies();

  const supabaseKey = options.useServiceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY!
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options: cookieOptions }) => {
              cookieStore.set(name, value, cookieOptions);
            });
          } catch {
            // setAll is called from Server Components where cookies cannot be mutated.
            // This is safe to ignore — the middleware handles session refresh.
          }
        },
      },
    },
  );
}

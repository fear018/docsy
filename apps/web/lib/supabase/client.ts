import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@docsy/shared';
import { publicEnv } from '@/lib/env';

/** Browser client. Runs under RLS as the signed-in user. */
export function createClient() {
  return createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@docsy/shared';
import { publicEnv } from '@/lib/env';
import { serverEnv } from '@/lib/env';

/**
 * Service-role client: bypasses RLS entirely.
 *
 * Only for work that has no user session — the ingestion worker, the public
 * widget endpoint and the Stripe webhook. Every such caller must do its own
 * authorisation check first (public key, Origin, quota). Never import this
 * into anything that renders in the browser.
 */
export function createServiceClient() {
  return createSupabaseClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv().SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

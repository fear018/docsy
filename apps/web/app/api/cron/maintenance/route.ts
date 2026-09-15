import { NextResponse, type NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { PLANS, effectivePlan, type SyncSchedule } from '@docsy/shared';
import { createServiceClient } from '@/lib/supabase/service';
import { ingestSource } from '@/lib/ingest/pipeline';

export const maxDuration = 60;

/**
 * Nightly upkeep: refresh documentation that has changed, delete conversations
 * past their retention, and pick up indexing that stalled.
 *
 * Runs on the service role because there is no session, and is gated by a
 * shared secret. Vercel sends it as a bearer token.
 */

const DAY_MS = 86_400_000;

/** How stale a source may get before its plan calls for a refresh. */
const INTERVAL: Record<SyncSchedule, number | null> = {
  manual: null,
  weekly: 7 * DAY_MS,
  daily: DAY_MS,
};

/** One pass indexes a handful of sources; the next run takes the rest. */
const SOURCES_PER_RUN = 5;

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorised(request)) {
    return NextResponse.json({ error: 'Not authorised.' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const report = { refreshed: 0, resumed: 0, conversationsDeleted: 0 };

  try {
    // ---- retention ------------------------------------------------------
    // Enforced by deleting, not by filtering the view. Telling someone their
    // data is kept for seven days while holding it forever is a lie.
    for (const plan of Object.values(PLANS)) {
      const days = plan.limits.historyDays;
      if (days === null) continue;

      const cutoff = new Date(Date.now() - days * DAY_MS).toISOString();
      const { data: owners } = await supabase.from('subscriptions').select('user_id, plan, status');

      const userIds = (owners ?? [])
        .filter((row) => effectivePlan(row.plan, row.status).id === plan.id)
        .map((row) => row.user_id);

      // Free owners usually have no subscription row at all, so they are found
      // by absence rather than by listing.
      const { data: bots } = await supabase
        .from('bots')
        .select('id, user_id')
        .in('user_id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000']);

      const botIds = (bots ?? []).map((bot) => bot.id);
      if (botIds.length === 0) continue;

      const { count } = await supabase
        .from('conversations')
        .delete({ count: 'exact' })
        .in('bot_id', botIds)
        .lt('created_at', cutoff);

      report.conversationsDeleted += count ?? 0;
    }

    // ---- stalled indexing ------------------------------------------------
    // A source left processing means the owner closed the tab mid-import.
    const stalled = new Date(Date.now() - 10 * 60_000).toISOString();
    const { data: stuck } = await supabase
      .from('sources')
      .select('id')
      .in('status', ['queued', 'processing'])
      .lt('updated_at', stalled)
      .limit(SOURCES_PER_RUN);

    for (const source of stuck ?? []) {
      await ingestSource(source.id);
      report.resumed += 1;
    }

    // ---- scheduled refresh ----------------------------------------------
    const { data: candidates } = await supabase
      .from('sources')
      .select('id, last_synced_at, bots!inner(user_id)')
      .eq('status', 'ready')
      .eq('auto_sync', true)
      .neq('type', 'text')
      .order('last_synced_at', { ascending: true, nullsFirst: true })
      .limit(50);

    for (const source of candidates ?? []) {
      if (report.refreshed >= SOURCES_PER_RUN) break;

      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan, status')
        .eq('user_id', source.bots.user_id)
        .maybeSingle();

      const interval =
        INTERVAL[effectivePlan(subscription?.plan, subscription?.status).features.autoSync];
      if (interval === null) continue;

      const last = source.last_synced_at ? new Date(source.last_synced_at).getTime() : 0;
      if (Date.now() - last < interval) continue;

      // Clearing discovery lets a refresh pick up pages added since last time.
      // Unchanged pages cost nothing: the content hash skips them.
      await supabase
        .from('sources')
        .update({ status: 'queued', discovered_urls: [] })
        .eq('id', source.id);
      await ingestSource(source.id);
      report.refreshed += 1;
    }
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Maintenance failed.', ...report }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...report });
}

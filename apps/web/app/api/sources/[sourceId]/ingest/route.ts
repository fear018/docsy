import { NextResponse, after, type NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/lib/supabase/server';
import { ingestSource } from '@/lib/ingest/pipeline';

// Indexing runs well past a normal response, so the platform is told to keep
// the function alive for the work scheduled with after().
export const maxDuration = 60;

/**
 * Starts or continues indexing one source.
 *
 * Authorisation is the signed-in owner: the select runs under RLS, so a source
 * belonging to someone else simply is not found. The work itself then uses the
 * service role, which is why that check has to happen here first.
 *
 * A large site needs more than one pass. Rather than have the server re-invoke
 * itself — which would need its own shared secret — the page polls and calls
 * this again while the source is still processing. Closing the tab pauses
 * indexing; reopening the page resumes it.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  const { sourceId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to index a source.' }, { status: 401 });
  }

  const { data: source } = await supabase
    .from('sources')
    .select('id, status')
    .eq('id', sourceId)
    .maybeSingle();

  if (!source) {
    return NextResponse.json({ error: 'That source does not exist.' }, { status: 404 });
  }

  if (source.status === 'ready') {
    return NextResponse.json({ done: true });
  }

  after(async () => {
    try {
      await ingestSource(sourceId);
    } catch (error) {
      Sentry.captureException(error);
    }
  });

  return NextResponse.json({ started: true });
}

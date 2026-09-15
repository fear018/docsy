'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { deleteSource, resyncSource } from './actions';
import { SubmitButton } from '@/components/ui';

export interface SourceRow {
  id: string;
  type: 'file' | 'url' | 'sitemap' | 'text';
  url: string | null;
  filename: string | null;
  status: 'queued' | 'processing' | 'ready' | 'error';
  pages_count: number;
  total_pages: number;
  error_message: string | null;
  last_synced_at: string | null;
}

const POLL_MS = 2000;

function label(source: SourceRow): string {
  if (source.type === 'file') return source.filename ?? 'Uploaded file';
  if (source.type === 'text') return source.filename ?? 'Pasted text';
  try {
    const url = new URL(source.url ?? '');
    return url.host + url.pathname.replace(/\/$/, '');
  } catch {
    return source.url ?? 'Source';
  }
}

/**
 * A spinner, not a dot.
 *
 * Indexing a large site can sit on the same page count for a while: the worker
 * is fetching a wave of pages before it writes anything. A static marker next
 * to an unchanging number reads as stuck, and the owner reloads or gives up.
 * Something moving says the work is alive even when the number is not.
 */
function Spinner() {
  return (
    <span
      aria-hidden
      className="border-brand/30 border-t-brand mr-2 inline-block size-3.5 animate-spin rounded-full border-2 align-[-2px]"
    />
  );
}

function describe(source: SourceRow): string {
  switch (source.status) {
    case 'queued':
      return 'Waiting to start';
    case 'processing':
      return source.total_pages > 0
        ? `Indexing ${source.pages_count} of ${source.total_pages} pages`
        : 'Looking for pages';
    case 'error':
      return source.error_message ?? 'Something went wrong';
    case 'ready':
      return source.pages_count === 1 ? '1 page indexed' : `${source.pages_count} pages indexed`;
  }
}

export function SourceList({ sources }: { sources: SourceRow[] }) {
  const router = useRouter();
  // Requests already in flight, so a slow pass is not started twice.
  const running = useRef(new Set<string>());

  const pending = sources.filter((s) => s.status === 'queued' || s.status === 'processing');
  const pendingKey = pending.map((s) => `${s.id}:${s.pages_count}`).join(',');

  useEffect(() => {
    if (pending.length === 0) return;

    let cancelled = false;

    const tick = async () => {
      await Promise.all(
        pending.map(async (source) => {
          if (running.current.has(source.id)) return;
          running.current.add(source.id);
          try {
            await fetch(`/api/sources/${source.id}/ingest`, { method: 'POST' });
          } catch {
            // A failed poll is not worth surfacing; the next one retries.
          } finally {
            running.current.delete(source.id);
          }
        }),
      );
      if (!cancelled) router.refresh();
    };

    const timer = setInterval(tick, POLL_MS);
    void tick();

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // pendingKey changes as progress advances, which restarts the poll cleanly.
  }, [pendingKey, pending, router]);

  if (sources.length === 0) {
    return (
      <div className="border-line mt-6 rounded-lg border border-dashed p-10 text-center">
        <p className="font-medium">Nothing indexed yet</p>
        <p className="text-muted mx-auto mt-2 max-w-sm text-sm">
          Add your documentation above. We read it, split it by heading and make it answerable.
        </p>
      </div>
    );
  }

  return (
    <ul className="mt-6 space-y-2">
      {sources.map((source) => (
        <li
          key={source.id}
          className="border-line flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate font-medium">{label(source)}</p>
            <p
              className={`mt-0.5 text-sm ${
                source.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-muted'
              }`}
            >
              {(source.status === 'processing' || source.status === 'queued') && <Spinner />}
              {describe(source)}
            </p>

            {source.status === 'processing' && source.total_pages > 0 && (
              <div
                className="bg-surface border-line mt-2 h-1 w-full max-w-xs overflow-hidden rounded-full border"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={source.total_pages}
                aria-valuenow={source.pages_count}
                aria-label="Indexing progress"
              >
                <div
                  className="bg-brand h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${Math.max((source.pages_count / source.total_pages) * 100, 3)}%`,
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex shrink-0 gap-2">
            {source.status !== 'processing' && source.type !== 'text' && (
              <form action={resyncSource}>
                <input type="hidden" name="sourceId" value={source.id} />
                <SubmitButton variant="ghost" pendingLabel="Starting…">
                  {source.status === 'error' ? 'Retry' : 'Re-sync'}
                </SubmitButton>
              </form>
            )}
            <form action={deleteSource}>
              <input type="hidden" name="sourceId" value={source.id} />
              <SubmitButton variant="ghost" pendingLabel="Removing…">
                Remove
              </SubmitButton>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}

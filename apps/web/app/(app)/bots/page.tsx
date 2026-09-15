import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { NewBotForm } from './new-bot-form';

export const metadata: Metadata = { title: 'Bots — Docsy' };

export default async function BotsPage() {
  const supabase = await createClient();
  // RLS scopes this to the signed-in owner; no user_id filter needed.
  const { data: bots, error } = await supabase
    .from('bots')
    .select('id, name, created_at, sources(count)')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="border-line bg-surface rounded-lg border p-6">
        <p className="font-medium">We could not load your bots</p>
        <p className="text-muted mt-1 text-sm">Refresh the page. If it persists, contact us.</p>
      </div>
    );
  }

  if (bots.length === 0) {
    return (
      <div className="border-line rounded-lg border border-dashed p-10 text-center">
        <h1 className="text-lg font-semibold">No bots yet</h1>
        <p className="text-muted mx-auto mt-2 max-w-sm text-sm">
          A bot is one documentation site, one knowledge base and one widget. Create one and point
          it at your docs.
        </p>
        <NewBotForm />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-lg font-semibold">Bots</h1>
        <NewBotForm compact />
      </div>

      <ul className="mt-6 space-y-2">
        {bots.map((bot) => {
          const sources = bot.sources?.[0]?.count ?? 0;
          return (
            <li key={bot.id}>
              <Link
                href={`/bots/${bot.id}/sources`}
                className="border-line bg-surface hover:border-brand flex items-center justify-between gap-4 rounded-lg border px-4 py-3 transition"
              >
                <span className="font-medium">{bot.name}</span>
                <span className="text-muted text-sm">
                  {sources === 0
                    ? 'No sources yet'
                    : `${sources} source${sources === 1 ? '' : 's'}`}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

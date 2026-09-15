import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Bots — Docsy' };

export default async function BotsPage() {
  const supabase = await createClient();
  // RLS limits this to the signed-in owner's rows; no user_id filter needed.
  const { data: bots, error } = await supabase
    .from('bots')
    .select('id, name, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="border-line bg-surface rounded-lg border p-6">
        <p className="font-medium">We could not load your bots</p>
        <p className="text-muted mt-1 text-sm">Refresh the page. If it persists, contact us.</p>
      </div>
    );
  }

  if (!bots || bots.length === 0) {
    return (
      <div className="border-line rounded-lg border border-dashed p-10 text-center">
        <h1 className="text-lg font-semibold">No bots yet</h1>
        <p className="text-muted mx-auto mt-2 max-w-sm text-sm">
          A bot is one documentation site, one knowledge base and one widget. Create one and point
          it at your docs.
        </p>
        <button
          type="button"
          disabled
          className="border-line text-muted mt-6 rounded-lg border px-4 py-2 text-sm"
        >
          Create a bot — coming in R1
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-lg font-semibold">Bots</h1>
      <ul className="mt-4 space-y-2">
        {bots.map((bot) => (
          <li key={bot.id} className="border-line bg-surface rounded-lg border px-4 py-3">
            {bot.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

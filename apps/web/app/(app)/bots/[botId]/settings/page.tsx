import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { RenameBotForm, DeleteBotForm } from './forms';

export default async function BotSettingsPage({ params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params;
  const supabase = await createClient();
  const { data: bot } = await supabase
    .from('bots')
    .select('id, name, public_key')
    .eq('id', botId)
    .maybeSingle();

  if (!bot) notFound();

  return (
    <div className="max-w-lg space-y-10">
      <section>
        <h2 className="font-medium">Name</h2>
        <p className="text-muted mt-1 text-sm">Only you see this. It is not shown to visitors.</p>
        <RenameBotForm botId={bot.id} name={bot.name} />
      </section>

      <section>
        <h2 className="font-medium">Widget key</h2>
        <p className="text-muted mt-1 text-sm">
          Identifies this bot in the embed snippet. Not a secret — requests are checked against the
          domains you allow.
        </p>
        <code className="border-line bg-surface mt-3 block overflow-x-auto rounded-lg border px-3 py-2 text-xs">
          {bot.public_key}
        </code>
      </section>

      <section>
        <h2 className="font-medium">Delete this bot</h2>
        <p className="text-muted mt-1 text-sm">
          Removes its sources, indexed pages and conversations. The widget stops answering
          immediately. This cannot be undone.
        </p>
        <DeleteBotForm botId={bot.id} name={bot.name} />
      </section>
    </div>
  );
}

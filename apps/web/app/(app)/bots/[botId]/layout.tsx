import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BotTabs } from './bot-tabs';

export default async function BotLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ botId: string }>;
}) {
  const { botId } = await params;
  const supabase = await createClient();

  // RLS turns "someone else's bot" into "no rows", so this covers both a bad id
  // and an id that belongs to another owner.
  const { data: bot } = await supabase
    .from('bots')
    .select('id, name')
    .eq('id', botId)
    .maybeSingle();

  if (!bot) notFound();

  return (
    <div>
      <Link href="/bots" className="text-muted hover:text-fg text-sm transition">
        ← All bots
      </Link>
      <h1 className="mt-2 text-xl font-semibold tracking-tight">{bot.name}</h1>
      <BotTabs botId={bot.id} />
      <div className="mt-8">{children}</div>
    </div>
  );
}

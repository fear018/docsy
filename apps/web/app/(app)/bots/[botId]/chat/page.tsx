import { createClient } from '@/lib/supabase/server';
import { Chat } from './chat';

export default async function ChatPage({ params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params;
  const supabase = await createClient();

  const { count } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('bot_id', botId);

  return <Chat botId={botId} hasSources={(count ?? 0) > 0} />;
}

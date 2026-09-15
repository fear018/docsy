import { createClient } from '@/lib/supabase/server';
import { Chat } from './chat';

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ botId: string }>;
  searchParams: Promise<{ c?: string }>;
}) {
  const { botId } = await params;
  const { c: conversationId } = await searchParams;
  const supabase = await createClient();

  const { count } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('bot_id', botId);

  // Recent conversations from this side of the product only. Widget threads
  // belong to visitors and are read in Insights, not reopened here.
  const { data: recent } = await supabase
    .from('conversations')
    .select('id, title, created_at')
    .eq('bot_id', botId)
    .eq('channel', 'app')
    .order('created_at', { ascending: false })
    .limit(12);

  let history: { role: 'user' | 'assistant'; content: string; citations: unknown }[] = [];

  if (conversationId) {
    const { data: messages } = await supabase
      .from('messages')
      .select('role, content, citations, conversations!inner(bot_id)')
      .eq('conversation_id', conversationId)
      .eq('conversations.bot_id', botId)
      .order('created_at', { ascending: true });
    history = messages ?? [];
  }

  return (
    <Chat
      botId={botId}
      hasSources={(count ?? 0) > 0}
      conversations={recent ?? []}
      openConversationId={conversationId ?? null}
      openMessages={history.map((message) => ({
        role: message.role,
        content: message.content,
        citations: Array.isArray(message.citations) ? message.citations : [],
      }))}
    />
  );
}

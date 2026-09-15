import { NextResponse, type NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { answerQuestion, type Turn } from '@/lib/rag/answer';
import type { Database } from '@docsy/shared';

type Json = Database['public']['Tables']['messages']['Insert']['citations'];

export const maxDuration = 60;

const bodySchema = z.object({
  question: z.string().trim().min(1, 'Ask something first.').max(2000),
  conversationId: z.uuid().nullish(),
});

/**
 * Streams newline-delimited JSON rather than plain text: the reader needs the
 * passages before the answer starts and the citations after it ends, and a
 * single text stream has nowhere to put either.
 */
function line(value: unknown): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(value)}\n`);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ botId: string }> },
) {
  const { botId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to use the chat.' }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Check your question and try again.' },
      { status: 400 },
    );
  }

  // RLS turns another owner's bot into no rows, so this is the access check.
  const { data: bot } = await supabase
    .from('bots')
    .select('id, tone')
    .eq('id', botId)
    .maybeSingle();
  if (!bot) return NextResponse.json({ error: 'That bot does not exist.' }, { status: 404 });

  let conversationId = parsed.data.conversationId ?? null;
  let history: Turn[] = [];

  if (conversationId) {
    const { data: previous } = await supabase
      .from('messages')
      .select('role, content, conversations!inner(bot_id)')
      .eq('conversation_id', conversationId)
      .eq('conversations.bot_id', botId)
      .order('created_at', { ascending: true })
      .limit(20);
    history = (previous ?? []).map((m) => ({ role: m.role, content: m.content }));
  } else {
    const { data: created } = await supabase
      .from('conversations')
      .insert({
        bot_id: botId,
        channel: 'app',
        title: parsed.data.question.slice(0, 80),
      })
      .select('id')
      .single();
    conversationId = created?.id ?? null;
  }

  if (!conversationId) {
    return NextResponse.json({ error: 'We could not start that conversation.' }, { status: 500 });
  }

  await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, role: 'user', content: parsed.data.question });

  const startedAt = Date.now();

  try {
    const { passages, stream, finish } = await answerQuestion(supabase, {
      botId,
      question: parsed.data.question,
      history,
      tone: bot.tone,
    });

    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(
          line({
            type: 'start',
            conversationId,
            passages: passages.map((p, index) => ({
              index: index + 1,
              title: p.title,
              headingPath: p.headingPath,
              url: p.url,
            })),
          }),
        );

        try {
          for await (const delta of stream)
            controller.enqueue(line({ type: 'delta', text: delta }));

          const { text, citations, wasAnswered } = finish();
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: text,
            // The column is jsonb; Citation[] is structurally valid JSON, but the
            // generated Json type cannot express that on its own.
            citations: citations as unknown as Json,
            was_answered: wasAnswered,
            latency_ms: Date.now() - startedAt,
          });

          controller.enqueue(line({ type: 'done', citations, wasAnswered }));
        } catch (error) {
          Sentry.captureException(error);
          controller.enqueue(
            line({ type: 'error', message: 'The answer stopped part way. Try asking again.' }),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(body, {
      headers: {
        'content-type': 'application/x-ndjson; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'We could not answer that right now.' }, { status: 500 });
  }
}

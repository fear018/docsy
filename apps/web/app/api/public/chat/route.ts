import { NextResponse, type NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { effectivePlan } from '@docsy/shared';
import { createServiceClient } from '@/lib/supabase/service';
import { answerQuestion, type Turn } from '@/lib/rag/answer';

export const maxDuration = 60;

/** Per visitor, per bot. Generous for a person, tight for a script. */
const RATE_LIMIT = 10;
const RATE_WINDOW = '1 minute';

const bodySchema = z.object({
  publicKey: z.string().min(8).max(64),
  question: z.string().trim().min(1).max(1000),
  conversationId: z.uuid().nullish(),
  visitorId: z.string().min(8).max(64),
  /**
   * The page the widget is embedded in, as reported by the browser. Nullish,
   * not optional: the settings preview opens the embed route directly, with no
   * parent to report, and null is not the same as absent to a schema.
   */
  parentOrigin: z.string().max(200).nullish(),
});

function line(value: unknown): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(value)}\n`);
}

function refuse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Identifies a visitor for rate limiting without storing who they are.
 *
 * The address is hashed with the bot key as salt, so the stored value is
 * useless outside this bot and cannot be reversed into an address. The product
 * tells visitors it does not collect their data; an ip column would quietly
 * make that untrue.
 */
function visitorKey(request: NextRequest, publicKey: string, visitorId: string): string {
  const address =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';
  return createHash('sha256').update(`${publicKey}:${address}:${visitorId}`).digest('hex');
}

function originAllowed(allowed: string[], parentOrigin: string | null | undefined): boolean {
  // An empty list means the owner has not restricted the widget yet.
  if (allowed.length === 0) return true;
  if (!parentOrigin) return false;

  let host: string;
  try {
    host = new URL(parentOrigin).hostname.toLowerCase();
  } catch {
    return false;
  }

  return allowed.some((entry) => {
    const rule = entry
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '');
    if (!rule) return false;
    // 'acme.com' also covers 'docs.acme.com'; the owner means their site.
    return host === rule || host.endsWith(`.${rule}`);
  });
}

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return refuse('That request was malformed.', 400);

  const { publicKey, question, visitorId, parentOrigin } = parsed.data;
  const supabase = createServiceClient();

  const { data: rows } = await supabase.rpc('bot_by_public_key', { p_public_key: publicKey });
  const bot = rows?.[0];
  // Say nothing about whether the key ever existed.
  if (!bot) return refuse('This assistant is unavailable.', 404);

  // The allowlist is a guard, not a boundary: everything the browser reports
  // can be forged by a client that is not a browser. It stops the widget being
  // pasted onto another site; the rate limit and quota below are what actually
  // cap the cost.
  if (!originAllowed(bot.allowed_origins ?? [], parentOrigin)) {
    return refuse('This assistant is not enabled for this site.', 403);
  }

  const { data: withinRate } = await supabase.rpc('consume_rate_limit', {
    p_key: visitorKey(request, publicKey, visitorId),
    p_limit: RATE_LIMIT,
    p_window: RATE_WINDOW,
  });
  if (withinRate === false) {
    return refuse('You are sending messages very quickly. Give it a moment.', 429);
  }

  const plan = effectivePlan(bot.plan, bot.subscription_status);

  // Before the model, never after. Otherwise the free plan is unmetered spend.
  const { data: withinQuota } = await supabase.rpc('consume_message_quota', {
    p_user_id: bot.owner_id,
    p_limit: plan.limits.messagesPerMonth,
  });
  if (withinQuota === false) {
    // The visitor is the site owner's customer and has no idea who we are, so
    // they are never shown anything about someone else's billing.
    return refuse('The assistant is unavailable right now. Please contact support.', 503);
  }

  let conversationId = parsed.data.conversationId ?? null;
  let history: Turn[] = [];

  if (conversationId) {
    const { data: previous } = await supabase
      .from('messages')
      .select('role, content, conversations!inner(bot_id, visitor_id)')
      .eq('conversation_id', conversationId)
      .eq('conversations.bot_id', bot.bot_id)
      .eq('conversations.visitor_id', visitorId)
      .order('created_at', { ascending: true })
      .limit(20);
    history = (previous ?? []).map((m) => ({ role: m.role, content: m.content }));
    // An id that does not belong to this visitor simply yields no history.
    if (history.length === 0) conversationId = null;
  }

  if (!conversationId) {
    const { data: created } = await supabase
      .from('conversations')
      .insert({
        bot_id: bot.bot_id,
        channel: 'widget',
        visitor_id: visitorId,
        title: question.slice(0, 80),
      })
      .select('id')
      .single();
    conversationId = created?.id ?? null;
  }

  if (!conversationId) return refuse('The assistant is unavailable right now.', 503);

  await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, role: 'user', content: question });

  const startedAt = Date.now();

  try {
    const { passages, stream, finish } = await answerQuestion(supabase, {
      botId: bot.bot_id,
      question,
      history,
      tone: bot.tone,
      // The widget's own title is what the visitor already sees above the
      // chat, so it is the truest description of what this bot is for.
      subject: (bot.widget_config as { title?: string } | null)?.title ?? null,
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
            citations: citations as never,
            was_answered: wasAnswered,
            latency_ms: Date.now() - startedAt,
          });

          controller.enqueue(line({ type: 'done', citations }));
        } catch (error) {
          Sentry.captureException(error);
          controller.enqueue(
            line({ type: 'error', message: 'The answer stopped part way. Try again.' }),
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
    return refuse('The assistant could not answer that right now.', 500);
  }
}

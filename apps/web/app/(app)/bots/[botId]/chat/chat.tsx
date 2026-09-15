'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Answer, type CitationRef } from '@/components/answer';
import { deleteConversation } from './actions';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: CitationRef[];
  streaming?: boolean;
}

const SUGGESTIONS = ['What does this product do?', 'How do I get started?', 'What are the limits?'];

export interface ConversationSummary {
  id: string;
  title: string | null;
  created_at: string;
}

export function Chat({
  botId,
  hasSources,
  conversations,
  openConversationId,
  openMessages,
}: {
  botId: string;
  hasSources: boolean;
  conversations: ConversationSummary[];
  openConversationId: string | null;
  openMessages: { role: 'user' | 'assistant'; content: string; citations: CitationRef[] }[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(() =>
    openMessages.map((message) => ({
      id: crypto.randomUUID(),
      role: message.role,
      content: message.content,
      citations: message.citations,
    })),
  );
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationId = useRef<string | null>(openConversationId);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    setError(null);
    setBusy(true);
    setQuestion('');

    const answerId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: 'user', content: trimmed, citations: [] },
      { id: answerId, role: 'assistant', content: '', citations: [], streaming: true },
    ]);

    const update = (patch: Partial<Message>) =>
      setMessages((current) =>
        current.map((message) => (message.id === answerId ? { ...message, ...patch } : message)),
      );

    try {
      const response = await fetch(`/api/bots/${botId}/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: trimmed, conversationId: conversationId.current }),
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? 'We could not answer that right now.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let text = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Newline-delimited JSON: keep the trailing partial line for next read.
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const raw of lines) {
          if (!raw.trim()) continue;
          const event = JSON.parse(raw);
          if (event.type === 'start') conversationId.current = event.conversationId;
          else if (event.type === 'delta') {
            text += event.text;
            update({ content: text });
          } else if (event.type === 'done') {
            update({ citations: event.citations, streaming: false });
          } else if (event.type === 'error') {
            throw new Error(event.message);
          }
        }
      }

      update({ streaming: false });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.');
      setMessages((current) => current.filter((message) => message.id !== answerId));
    } finally {
      setBusy(false);
      // A new conversation only appears in the list once it has a message.
      if (!openConversationId) router.refresh();
    }
  }

  if (!hasSources) {
    return (
      <div className="border-line rounded-lg border border-dashed p-10 text-center">
        <p className="font-medium">Nothing to answer from yet</p>
        <p className="text-muted mx-auto mt-2 max-w-sm text-sm">
          Add a source first. Once a page is indexed, you can ask about it here exactly as your
          visitors will.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_14rem]">
      <div className="flex min-h-[28rem] flex-col lg:order-1">
        <div className="flex-1 space-y-6">
          {messages.length === 0 && (
            <div className="text-muted text-sm">
              <p>
                Ask anything your documentation covers. Answers cite the section they came from.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => ask(suggestion)}
                    className="border-line hover:border-brand rounded-full border px-3 py-1.5 text-sm transition"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) =>
            message.role === 'user' ? (
              <div key={message.id} className="flex justify-end">
                <p className="bg-surface border-line max-w-[85%] rounded-2xl rounded-br-md border px-4 py-2.5 text-[15px]">
                  {message.content}
                </p>
              </div>
            ) : (
              <div key={message.id}>
                {message.content ? (
                  <Answer text={message.content} citations={message.citations} />
                ) : (
                  <p className="text-muted text-sm" role="status">
                    Searching the documentation…
                  </p>
                )}
              </div>
            ),
          )}

          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <div ref={bottom} />
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void ask(question);
          }}
          className="bg-bg sticky bottom-0 mt-6 flex gap-2 py-3"
        >
          <label htmlFor="question" className="sr-only">
            Your question
          </label>
          <input
            id="question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            disabled={busy}
            placeholder="Ask about your documentation…"
            className="border-line focus:border-brand h-10 flex-1 rounded-lg border bg-transparent px-4 text-sm outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={busy || !question.trim()}
            className="bg-brand text-brand-fg h-10 rounded-lg px-4 text-sm font-medium transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Thinking…' : 'Ask'}
          </button>
        </form>
      </div>

      <aside className="lg:order-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Conversations</h2>
          {(messages.length > 0 || openConversationId) && (
            <button
              type="button"
              onClick={() => {
                // A link here pointed at the page we are already on, so nothing
                // navigated and nothing happened. Clearing the state is what
                // "new chat" actually means.
                setMessages([]);
                setError(null);
                setQuestion('');
                conversationId.current = null;
                if (openConversationId) router.replace(`/bots/${botId}/chat`);
              }}
              className="text-brand text-sm font-medium underline-offset-2 hover:underline"
            >
              New chat
            </button>
          )}
        </div>

        {conversations.length === 0 ? (
          <p className="text-muted mt-2 text-sm">Nothing yet. Ask something to start one.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {conversations.map((conversation) => {
              const open = conversation.id === openConversationId;
              return (
                <li key={conversation.id} className="group flex items-center gap-1">
                  <Link
                    href={`/bots/${botId}/chat?c=${conversation.id}`}
                    className={`min-w-0 flex-1 truncate rounded-lg px-2.5 py-1.5 text-sm transition ${
                      open
                        ? 'bg-surface border-line border font-medium'
                        : 'text-muted hover:text-fg'
                    }`}
                  >
                    {conversation.title ?? 'Untitled'}
                  </Link>
                  <form action={deleteConversation}>
                    <input type="hidden" name="conversationId" value={conversation.id} />
                    <input type="hidden" name="botId" value={botId} />
                    <button
                      type="submit"
                      aria-label={`Delete conversation: ${conversation.title ?? 'Untitled'}`}
                      className="text-muted hover:text-fg rounded px-1.5 py-1 text-sm opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                    >
                      ×
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </aside>
    </div>
  );
}

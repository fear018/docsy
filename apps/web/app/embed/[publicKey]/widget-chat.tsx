'use client';

import { useEffect, useRef, useState } from 'react';
import { Answer, type CitationRef } from '@/components/answer';
import type { WidgetConfig } from './page';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: CitationRef[];
}

/**
 * Text that stays readable on whatever colour the customer picked.
 *
 * The accent is theirs to choose and some of them pick a bright green. White
 * on that is a label you have to lean in to read, which is not a thing we get
 * to ask of their visitors.
 */
function readableOn(hex: string): string {
  const full =
    hex.length === 4
      ? hex
          .slice(1)
          .split('')
          .map((c) => c + c)
          .join('')
      : hex.slice(1);
  const value = Number.parseInt(full, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  // Perceived brightness, not the raw average: the eye weights green heavily.
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#14171a' : '#ffffff';
}

/** Stable per browser so a visitor's own conversation survives a reload. */
function visitorId(): string {
  const KEY = 'docsy.visitor';
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    // Private windows and blocked storage: a per-load id still works.
    return crypto.randomUUID();
  }
}

export function WidgetChat({
  theme,
  publicKey,
  parentOrigin,
  config,
  showBranding,
}: {
  /** Set by the settings preview only; null means follow the visitor. */
  theme: 'light' | 'dark' | null;
  publicKey: string;
  parentOrigin: string | null;
  config: WidgetConfig;
  showBranding: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationId = useRef<string | null>(null);
  const visitor = useRef<string>('');
  const bottom = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    visitor.current = visitorId();
    input.current?.focus();
  }, []);

  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
  }, [theme]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  // Escape closes the widget; the launcher outside the frame owns the state.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') window.parent.postMessage({ type: 'docsy:close' }, '*');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const starters = config.starters?.filter(Boolean).slice(0, 4) ?? [];

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
      { id: answerId, role: 'assistant', content: '', citations: [] },
    ]);

    const update = (patch: Partial<Message>) =>
      setMessages((current) =>
        current.map((message) => (message.id === answerId ? { ...message, ...patch } : message)),
      );

    try {
      const response = await fetch('/api/public/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          publicKey,
          question: trimmed,
          conversationId: conversationId.current,
          visitorId: visitor.current,
          parentOrigin,
        }),
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? 'The assistant is unavailable right now.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let text2 = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const raw of lines) {
          if (!raw.trim()) continue;
          const event = JSON.parse(raw);
          if (event.type === 'start') conversationId.current = event.conversationId;
          else if (event.type === 'delta') {
            text2 += event.text;
            update({ content: text2 });
          } else if (event.type === 'done') update({ citations: event.citations });
          else if (event.type === 'error') throw new Error(event.message);
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.');
      setMessages((current) => current.filter((message) => message.id !== answerId));
    } finally {
      setBusy(false);
      input.current?.focus();
    }
  }

  return (
    <div
      className="flex h-dvh flex-col"
      /*
       * --brand, not --color-brand. Tailwind's `@theme inline` compiles
       * bg-brand down to var(--brand) and drops the --color-* name entirely,
       * so overriding the one the theme block reads changed nothing and the
       * accent silently did not work anywhere in the frame.
       */
      style={
        config.accent
          ? ({
              '--brand': config.accent,
              '--brand-fg': readableOn(config.accent),
            } as React.CSSProperties)
          : undefined
      }
    >
      <header className="border-line flex items-center justify-between gap-3 border-b px-4 py-3">
        <p className="truncate text-sm font-semibold">{config.title ?? 'Ask the docs'}</p>
        <button
          type="button"
          onClick={() => window.parent.postMessage({ type: 'docsy:close' }, '*')}
          aria-label="Close the assistant"
          className="text-muted hover:text-fg -mr-1 rounded p-1 text-lg leading-none transition"
        >
          ×
        </button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <>
            <p className="text-muted text-sm">
              {config.greeting ?? 'Ask anything about the documentation.'}
            </p>
            {starters.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {starters.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => ask(starter)}
                    className="border-line hover:border-brand rounded-full border px-3 py-1.5 text-left text-sm transition"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {messages.map((message) =>
          message.role === 'user' ? (
            <div key={message.id} className="flex justify-end">
              <p className="bg-surface border-line max-w-[85%] rounded-2xl rounded-br-md border px-3.5 py-2 text-sm">
                {message.content}
              </p>
            </div>
          ) : (
            <div key={message.id} className="text-sm">
              {message.content ? (
                <Answer text={message.content} citations={message.citations} />
              ) : (
                <p className="text-muted" role="status">
                  Looking through the documentation…
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
        className="border-line border-t px-4 py-3"
      >
        <div className="flex gap-2">
          <label htmlFor="q" className="sr-only">
            Your question
          </label>
          <input
            id="q"
            ref={input}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            disabled={busy}
            placeholder="Ask a question…"
            className="border-line focus:border-brand h-10 min-w-0 flex-1 rounded-lg border bg-transparent px-3 text-sm outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={busy || !question.trim()}
            className="bg-brand text-brand-fg h-10 rounded-lg px-3.5 text-sm font-medium transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? '…' : 'Ask'}
          </button>
        </div>
        {showBranding && (
          <p className="text-muted mt-2 text-center text-[11px]">
            Powered by{' '}
            <a
              href="https://docsy-web-ivory.vercel.app"
              target="_blank"
              rel="noreferrer noopener"
              className="underline underline-offset-2"
            >
              Docsy
            </a>
          </p>
        )}
      </form>
    </div>
  );
}

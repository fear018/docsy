'use client';

import { useRef, useState } from 'react';
import { Answer, type CitationRef } from '@/components/answer';

interface Turn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: CitationRef[];
}

const QUESTIONS = [
  'What is a connection pooler and when should I use one?',
  'Does Supabase support IPv4?',
  'How do I connect from a serverless function?',
];

/**
 * The landing page's proof.
 *
 * A screenshot says the product works; this lets the visitor check. It runs
 * against the same public endpoint a customer's widget uses, on a bot indexed
 * from Supabase's own documentation — chosen because it is large, public, and
 * a reader can verify the answers against the real pages.
 */
export function DemoChat({ publicKey }: { publicKey: string | null }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const visitor = useRef<string>('');
  const conversation = useRef<string | null>(null);

  if (!publicKey) {
    return (
      <div className="border-line bg-surface rounded-xl border p-6 text-sm">
        <p className="font-medium">The demo is offline right now</p>
        <p className="text-muted mt-1">
          Sign up and point it at your own documentation instead — the free plan indexes 50 pages.
        </p>
      </div>
    );
  }

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    visitor.current ||= crypto.randomUUID();
    setError(null);
    setBusy(true);
    setQuestion('');

    const id = crypto.randomUUID();
    setTurns((current) => [
      ...current,
      { id: crypto.randomUUID(), role: 'user', content: trimmed, citations: [] },
      { id, role: 'assistant', content: '', citations: [] },
    ]);

    const update = (patch: Partial<Turn>) =>
      setTurns((current) => current.map((turn) => (turn.id === id ? { ...turn, ...patch } : turn)));

    try {
      const response = await fetch('/api/public/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          publicKey,
          question: trimmed,
          conversationId: conversation.current,
          visitorId: visitor.current,
          parentOrigin: window.location.origin,
        }),
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? 'The demo is busy. Try again in a moment.');
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
          if (event.type === 'start') conversation.current = event.conversationId;
          else if (event.type === 'delta') {
            text2 += event.text;
            update({ content: text2 });
          } else if (event.type === 'done') update({ citations: event.citations });
          else if (event.type === 'error') throw new Error(event.message);
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.');
      setTurns((current) => current.filter((turn) => turn.id !== id));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-line bg-surface overflow-hidden rounded-xl border">
      <div className="border-line flex items-center gap-2 border-b px-4 py-2.5">
        <span className="bg-brand size-2 rounded-full" aria-hidden />
        <p className="text-sm font-medium">Ask Supabase&rsquo;s documentation</p>
        <span className="text-muted ml-auto text-xs">live, not a recording</span>
      </div>

      <div className="min-h-[13rem] space-y-4 px-4 py-4">
        {turns.length === 0 && (
          <>
            <p className="text-muted text-sm">
              This bot was built the way yours would be: one link, five minutes. Ask it something.
            </p>
            <div className="flex flex-wrap gap-2">
              {QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => ask(q)}
                  className="border-line hover:border-brand bg-bg rounded-full border px-3 py-1.5 text-left text-sm transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </>
        )}

        {turns.map((turn) =>
          turn.role === 'user' ? (
            <p
              key={turn.id}
              className="border-line bg-bg ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md border px-3.5 py-2 text-sm"
            >
              {turn.content}
            </p>
          ) : (
            <div key={turn.id} className="text-sm">
              {turn.content ? (
                <Answer text={turn.content} citations={turn.citations} />
              ) : (
                <p className="text-muted" role="status">
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
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void ask(question);
        }}
        className="border-line flex gap-2 border-t px-4 py-3"
      >
        <label htmlFor="demo-q" className="sr-only">
          Ask the demo a question
        </label>
        <input
          id="demo-q"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          disabled={busy}
          placeholder="Or ask your own question…"
          className="border-line focus:border-brand bg-bg min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || !question.trim()}
          className="bg-brand text-brand-fg rounded-lg px-4 py-2 text-sm font-medium transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? '…' : 'Ask'}
        </button>
      </form>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A page for trying the embed snippet without owning a website.
 *
 * The pasted snippet is never executed or inserted as markup. It is read for
 * the handful of attributes we recognise and the script tag is rebuilt here,
 * always pointing at our own widget.js. Running a stranger's script tag on our
 * own origin would be handing them the page.
 */

interface WidgetApi {
  open: () => void;
  destroy: () => void;
}

function installed(): WidgetApi | undefined {
  return (window as unknown as { Docsy?: WidgetApi }).Docsy;
}

interface Parsed {
  bot: string;
  label?: string;
  accent?: string;
  position?: 'left' | 'right';
}

function parseSnippet(input: string): Parsed | { error: string } {
  const text = input.trim();
  if (!text) return { error: 'Paste your snippet, or just the bot key.' };

  // A bare key is the common case: people copy the value, not the tag.
  const bare = text.match(/^(pk_[a-z0-9]{8,})$/i);
  if (bare) return { bot: bare[1]! };

  const bot = text.match(/data-bot\s*=\s*["']([^"']+)["']/i)?.[1];
  if (!bot) return { error: 'No data-bot key found in that snippet.' };
  if (!/^pk_[a-z0-9]{8,}$/i.test(bot)) return { error: 'That does not look like a bot key.' };

  const attr = (name: string) =>
    text.match(new RegExp(`data-${name}\\s*=\\s*["']([^"']+)["']`, 'i'))?.[1];

  const accent = attr('accent');
  const position = attr('position');

  return {
    bot,
    label: attr('label')?.slice(0, 60),
    // Only a hex colour is passed through; anything else is ignored rather
    // than trusted into a style attribute.
    accent: accent && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(accent) ? accent : undefined,
    position: position === 'left' ? 'left' : undefined,
  };
}

export function TryWidget({ demoKey }: { demoKey: string | null }) {
  const [snippet, setSnippet] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<Parsed | null>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  // Leaving this page must take the widget with it. Guessing which nodes are
  // ours went wrong once already: the panel stayed behind as a coloured
  // rectangle after the frame was removed. The widget takes itself down.
  useEffect(() => {
    return () => {
      installed()?.destroy();
      scriptRef.current?.remove();
    };
  }, []);

  function load(raw: string) {
    const parsed = parseSnippet(raw);
    if ('error' in parsed) {
      setError(parsed.error);
      return;
    }

    setError(null);

    // Replace rather than stack: loading twice would leave two launchers.
    installed()?.destroy();
    scriptRef.current?.remove();

    const script = document.createElement('script');
    script.src = '/widget.js';
    script.defer = true;
    script.dataset.bot = parsed.bot;
    if (parsed.label) script.dataset.label = parsed.label;
    if (parsed.accent) script.dataset.accent = parsed.accent;
    if (parsed.position) script.dataset.position = parsed.position;

    document.body.append(script);
    scriptRef.current = script;
    setLoaded(parsed);
  }

  return (
    <div className="border-line bg-surface rounded-xl border p-5">
      <label htmlFor="snippet" className="block text-sm font-medium">
        Your snippet, or just the bot key
      </label>
      <p className="text-muted mt-1 text-sm">
        Copy it from the Widget tab of any bot. The key starts with{' '}
        <code className="text-xs">pk_</code>.
      </p>
      <textarea
        id="snippet"
        value={snippet}
        onChange={(event) => setSnippet(event.target.value)}
        rows={3}
        spellCheck={false}
        placeholder={'<script src="…/widget.js" data-bot="pk_…" defer></script>'}
        aria-describedby={error ? 'snippet-error' : undefined}
        className="border-line focus:border-brand mt-3 w-full resize-y rounded-lg border bg-transparent px-3 py-2 font-mono text-xs outline-none"
      />
      {error && (
        <p id="snippet-error" role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => load(snippet)}
          className="bg-brand text-brand-fg rounded-lg px-4 py-2.5 text-sm font-medium transition hover:opacity-90"
        >
          {loaded ? 'Reload the widget' : 'Load the widget'}
        </button>

        {demoKey && (
          <button
            type="button"
            onClick={() => {
              setSnippet(demoKey);
              load(demoKey);
            }}
            className="border-line hover:bg-surface rounded-lg border px-4 py-2.5 text-sm font-medium transition"
          >
            Use the demo bot
          </button>
        )}
      </div>

      {loaded && (
        <p role="status" className="text-muted mt-3 text-sm">
          Loaded. The launcher is in the corner — open it and ask something.
        </p>
      )}
    </div>
  );
}

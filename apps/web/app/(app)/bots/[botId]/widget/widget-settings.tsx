'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { widgetConfigSchema } from '@docsy/shared';
import { saveWidgetConfig, type WidgetState } from './actions';
import { FieldError, SubmitButton } from '@/components/ui';
import { Field } from '@/components/field';
import { useTheme } from '@/components/theme';

export interface WidgetForm {
  botId: string;
  publicKey: string;
  title: string;
  greeting: string;
  accent: string;
  position: 'right' | 'left';
  starters: string[];
  allowedOrigins: string[];
  /** false on the basic tier, where only title and accent are editable. */
  fullCustomisation: boolean;
  appUrl: string;
}

const INPUT =
  'border-line focus:border-brand w-full rounded-lg border bg-transparent px-3 text-sm outline-none h-10';

export function WidgetSettings(props: WidgetForm) {
  const [state, action] = useActionState<WidgetState, FormData>(saveWidgetConfig, {});
  const [appTheme] = useTheme();
  const [title, setTitle] = useState(props.title);
  const [greeting, setGreeting] = useState(props.greeting);
  const [accent, setAccent] = useState(props.accent);
  const [position, setPosition] = useState(props.position);
  const [starters, setStarters] = useState<string[]>(
    [...props.starters, '', '', '', ''].slice(0, 4),
  );
  const [copied, setCopied] = useState(false);

  /**
   * Loaded once, with the saved values, and never reloaded after that.
   *
   * It used to be keyed on the edited values, so every change tore the frame
   * down and navigated a fresh one — a whole page rebuilt because one colour
   * moved, and any chat you were testing thrown away with it. Changes are
   * posted into the running frame instead, which is why this URL must not
   * depend on them.
   */
  const previewUrl = useMemo(() => {
    const url = new URL(`/embed/${props.publicKey}`, props.appUrl);
    url.searchParams.set('preview', '1');
    url.searchParams.set('title', props.title);
    url.searchParams.set('accent', props.accent);
    if (props.fullCustomisation) {
      if (props.greeting) url.searchParams.set('greeting', props.greeting);
      const list = props.starters.filter(Boolean);
      if (list.length > 0) url.searchParams.set('starters', list.join('\n'));
    }
    return url.toString();
  }, [
    props.publicKey,
    props.appUrl,
    props.title,
    props.accent,
    props.greeting,
    props.starters,
    props.fullCustomisation,
  ]);

  const frame = useRef<HTMLIFrameElement>(null);
  const [frameReady, setFrameReady] = useState(false);

  /*
   * Half-typed colours are not sent. "#3f" is what "#3fd564" looks like on the
   * way in, and the preview flashing back to the default between keystrokes
   * would be worse than showing the last colour that made sense.
   */
  const lastAccent = useRef(props.accent);

  // No debounce: a postMessage costs nothing, so the preview keeps up with
  // typing instead of catching up a second later.
  useEffect(() => {
    if (!frameReady) return;
    if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(accent)) lastAccent.current = accent;
    frame.current?.contentWindow?.postMessage(
      {
        type: 'docsy:preview',
        // The preview matches the app around it. A visitor's widget follows
        // their own system setting instead.
        theme: appTheme === 'system' ? null : appTheme,
        config: {
          title,
          accent: lastAccent.current,
          greeting: props.fullCustomisation ? greeting : undefined,
          starters: props.fullCustomisation ? starters.filter(Boolean) : [],
        },
      },
      new URL(props.appUrl).origin,
    );
  }, [
    frameReady,
    title,
    accent,
    greeting,
    starters,
    appTheme,
    props.appUrl,
    props.fullCustomisation,
  ]);

  const snippet = `<script src="${props.appUrl}/widget.js" data-bot="${props.publicKey}" data-label="${title.replace(/"/g, '&quot;')}" data-accent="${accent}"${
    position === 'left' ? ' data-position="left"' : ''
  } defer></script>`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the snippet is selectable either way.
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <form action={action} noValidate className="space-y-6">
        <input type="hidden" name="botId" value={props.botId} />

        <section className="space-y-3">
          <h2 className="font-medium">Appearance</h2>

          <Field
            name="title"
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={40}
            schema={widgetConfigSchema.shape.title}
          />

          <div className="flex flex-wrap items-end gap-4">
            <div>
              <span className="text-muted block text-sm">Accent colour</span>
              <div className="mt-1 flex items-center gap-2">
                <Field
                  name="accent"
                  label="Accent colour"
                  hideLabel
                  value={accent}
                  onChange={(event) => setAccent(event.target.value)}
                  schema={widgetConfigSchema.shape.accent}
                  className="w-32 font-mono"
                />
                <input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(accent) ? accent : '#3b6fd4'}
                  onChange={(event) => setAccent(event.target.value)}
                  aria-label="Pick the accent colour"
                  className="border-line size-9 shrink-0 cursor-pointer rounded border bg-transparent"
                />
              </div>
            </div>

            <fieldset disabled={!props.fullCustomisation}>
              <legend className="text-muted text-sm">Side</legend>
              <div className="mt-1 flex gap-1">
                {/* Left on the left. A control that contradicts the thing it
                    sets makes you read it twice. */}
                {(['left', 'right'] as const).map((side) => (
                  <label
                    key={side}
                    /*
                     * The chosen side is filled, not merely outlined. A border
                     * in the accent colour is the kind of difference you find
                     * by comparing the two buttons — which is one comparison
                     * more than anybody should have to make to read a setting.
                     * The ring is here because the radio itself is sr-only, so
                     * without it the keyboard focus lands somewhere invisible.
                     */
                    className={`has-[:focus-visible]:ring-brand has-[:focus-visible]:ring-offset-bg cursor-pointer rounded-lg border px-3 py-2 text-sm capitalize transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-offset-2 ${
                      position === side
                        ? 'border-brand bg-brand text-brand-fg font-medium'
                        : 'border-line hover:bg-surface'
                    } ${props.fullCustomisation ? '' : 'opacity-50'}`}
                  >
                    <input
                      type="radio"
                      name="position"
                      value={side}
                      checked={position === side}
                      onChange={() => setPosition(side)}
                      className="sr-only"
                    />
                    {side}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-medium">
            Opening{' '}
            {!props.fullCustomisation && (
              <span className="text-muted text-sm font-normal">— Pro and above</span>
            )}
          </h2>
          <fieldset disabled={!props.fullCustomisation} className="space-y-3 disabled:opacity-50">
            <div>
              <label htmlFor="greeting" className="text-muted block text-sm">
                Greeting
              </label>
              <input
                id="greeting"
                name="greeting"
                value={greeting}
                onChange={(event) => setGreeting(event.target.value)}
                maxLength={200}
                placeholder="Ask anything about the documentation."
                className={`${INPUT} mt-1`}
              />
            </div>

            <div>
              <span className="text-muted block text-sm">Starter questions</span>
              <p className="text-muted mt-0.5 text-xs">
                One tap each. Pick what people actually ask, not what you wish they asked.
              </p>
              <div className="mt-2 space-y-2">
                {starters.map((starter, index) => (
                  <div key={index}>
                    <label htmlFor={`starter-${index}`} className="sr-only">
                      Starter question {index + 1}
                    </label>
                    <input
                      id={`starter-${index}`}
                      name="starter"
                      value={starter}
                      onChange={(event) =>
                        setStarters((current) =>
                          current.map((value, i) => (i === index ? event.target.value : value)),
                        )
                      }
                      maxLength={80}
                      placeholder={index === 0 ? 'How do I get started?' : ''}
                      className={INPUT}
                    />
                  </div>
                ))}
              </div>
            </div>
          </fieldset>
        </section>

        <section className="space-y-2">
          <h2 className="font-medium">Allowed domains</h2>
          <p className="text-muted text-sm">
            One per line. Subdomains are covered automatically. Leave empty to allow any site — fine
            while you are testing, worth filling in once you install it.
          </p>
          <p className="text-muted text-sm">
            A page opened straight from your disk reports no address at all, so it only works while
            this list is empty.
          </p>
          <label htmlFor="allowedOrigins" className="sr-only">
            Allowed domains
          </label>
          <textarea
            id="allowedOrigins"
            name="allowedOrigins"
            rows={3}
            defaultValue={props.allowedOrigins.join('\n')}
            placeholder="acme.com"
            className={`${INPUT} resize-y font-mono`}
          />
        </section>

        <FieldError id="widget-error">{state.error}</FieldError>
        <div className="flex items-center gap-3">
          <SubmitButton pendingLabel="Saving…">Save settings</SubmitButton>
          {state.saved && !state.error && (
            <span role="status" className="text-sm text-green-700 dark:text-green-400">
              Saved.
            </span>
          )}
        </div>
      </form>

      <aside className="space-y-6">
        <section>
          <h2 className="font-medium">Preview</h2>
          <p className="text-muted mt-1 text-sm">
            The real widget, not a drawing of one — the same page your visitors open.
          </p>
          <div className="border-line bg-surface mt-2 overflow-hidden rounded-lg border">
            <iframe
              ref={frame}
              src={previewUrl}
              onLoad={() => setFrameReady(true)}
              title="Widget preview"
              className="h-96 w-full border-0"
              style={{ colorScheme: 'light dark' }}
            />
          </div>
        </section>

        <section>
          <h2 className="font-medium">Install</h2>
          <p className="text-muted mt-1 text-sm">
            Paste this before <code className="text-xs">&lt;/body&gt;</code> on your site.
          </p>
          <pre className="border-line bg-surface mt-2 overflow-x-auto rounded-lg border p-3 text-[11px] leading-relaxed">
            {snippet}
          </pre>
          <p className="text-muted mt-2 text-sm">
            No site to try it on yet?{' '}
            <a
              href="/try"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              Load it on our test page
            </a>
            .
          </p>
          <button
            type="button"
            onClick={copy}
            className="border-line hover:bg-surface mt-2 w-full rounded-lg border px-3 py-2 text-sm font-medium transition"
          >
            {copied ? 'Copied' : 'Copy snippet'}
          </button>
        </section>
      </aside>
    </div>
  );
}

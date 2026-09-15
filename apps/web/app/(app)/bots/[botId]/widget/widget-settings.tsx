'use client';

import { useActionState, useState } from 'react';
import { widgetConfigSchema } from '@docsy/shared';
import { saveWidgetConfig, type WidgetState } from './actions';
import { FieldError, SubmitButton } from '@/components/ui';
import { Field } from '@/components/field';

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
  const [title, setTitle] = useState(props.title);
  const [greeting, setGreeting] = useState(props.greeting);
  const [accent, setAccent] = useState(props.accent);
  const [position, setPosition] = useState(props.position);
  const [starters, setStarters] = useState<string[]>(
    [...props.starters, '', '', '', ''].slice(0, 4),
  );
  const [copied, setCopied] = useState(false);

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
                {(['right', 'left'] as const).map((side) => (
                  <label
                    key={side}
                    className={`border-line cursor-pointer rounded-lg border px-3 py-2 text-sm capitalize ${
                      position === side ? 'border-brand font-medium' : ''
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
          <div className="border-line bg-surface relative mt-2 h-72 overflow-hidden rounded-lg border">
            <div className="border-line bg-bg absolute inset-x-3 top-3 rounded-lg border shadow-sm">
              <div className="border-line flex items-center justify-between border-b px-3 py-2">
                <span className="truncate text-xs font-semibold">{title || 'Ask the docs'}</span>
                <span className="text-muted text-xs">×</span>
              </div>
              <div className="space-y-2 p-3">
                <p className="text-muted text-xs">
                  {(props.fullCustomisation && greeting) || 'Ask anything about the documentation.'}
                </p>
                {props.fullCustomisation &&
                  starters
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((starter) => (
                      <span
                        key={starter}
                        className="border-line mr-1 inline-block rounded-full border px-2 py-1 text-[11px]"
                      >
                        {starter}
                      </span>
                    ))}
              </div>
              <div className="border-line flex gap-1.5 border-t p-2">
                <span className="border-line text-muted flex-1 rounded border px-2 py-1 text-[11px]">
                  Ask a question…
                </span>
                <span
                  className="rounded px-2 py-1 text-[11px] font-medium text-white"
                  style={{ background: accent }}
                >
                  Ask
                </span>
              </div>
            </div>
            <span
              className={`absolute bottom-3 grid size-9 place-items-center rounded-full text-lg font-semibold text-white ${
                position === 'left' ? 'left-3' : 'right-3'
              }`}
              style={{ background: accent }}
              aria-hidden
            >
              ?
            </span>
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

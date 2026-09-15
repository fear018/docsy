'use client';

import { useActionState, useState } from 'react';
import {
  publicUrlSchema,
  addTextSourceSchema,
  addUrlSourceSchema,
  DEFAULT_PAGES_PER_SOURCE,
} from '@docsy/shared';
import { addUrlSource, addTextSource, addFileSource, type SourceState } from './actions';
import { FieldError, SubmitButton } from '@/components/ui';
import { Field } from '@/components/field';

type Kind = 'url' | 'file' | 'text';

const KINDS: { id: Kind; label: string; hint: string }[] = [
  { id: 'url', label: 'Website', hint: 'Point at your documentation and we follow its sitemap.' },
  { id: 'file', label: 'File', hint: 'PDF, Word, Markdown or plain text, up to 20 MB.' },
  { id: 'text', label: 'Text', hint: 'Paste anything that is not published anywhere yet.' },
];

const INPUT =
  'border-line focus:border-brand w-full rounded-lg border bg-transparent px-4 py-2.5 text-sm outline-none';

export function AddSource({ botId }: { botId: string }) {
  const [kind, setKind] = useState<Kind>('url');
  const [crawl, setCrawl] = useState(true);

  const [urlState, urlAction] = useActionState<SourceState, FormData>(addUrlSource, {});
  const [fileState, fileAction] = useActionState<SourceState, FormData>(addFileSource, {});
  const [textState, textAction] = useActionState<SourceState, FormData>(addTextSource, {});

  const active = KINDS.find((k) => k.id === kind)!;

  return (
    <section className="border-line bg-surface rounded-lg border p-5">
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Source type">
        {KINDS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={kind === option.id}
            onClick={() => setKind(option.id)}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              kind === option.id ? 'bg-brand text-brand-fg font-medium' : 'text-muted hover:text-fg'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="text-muted mt-3 text-sm">{active.hint}</p>

      {kind === 'url' && (
        <form action={urlAction} noValidate className="mt-4 space-y-3">
          <input type="hidden" name="botId" value={botId} />
          <Field
            name="url"
            label="Documentation address"
            hideLabel
            type="url"
            inputMode="url"
            placeholder="https://acme.com/docs"
            schema={publicUrlSchema}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="crawlSite"
              checked={crawl}
              onChange={(event) => setCrawl(event.target.checked)}
              className="accent-brand"
            />
            Index the whole site, not just this page
          </label>
          {crawl && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                name="maxPages"
                label="Index at most"
                type="number"
                inputMode="numeric"
                min={1}
                max={500}
                defaultValue={DEFAULT_PAGES_PER_SOURCE}
                hint="Pages. Start small — you can raise it and re-sync."
                schema={addUrlSourceSchema.shape.maxPages}
              />
              <div>
                <label htmlFor="pathPrefix" className="text-muted block text-sm">
                  Only paths starting with
                </label>
                <input
                  id="pathPrefix"
                  name="pathPrefix"
                  placeholder="/docs"
                  className={`${INPUT} mt-1`}
                />
                <p className="text-muted mt-1 text-xs">
                  Leave empty to take whatever the sitemap lists.
                </p>
              </div>
            </div>
          )}
          <FieldError id="url-error">{urlState.error}</FieldError>
          <SubmitButton pendingLabel="Adding…">Add source</SubmitButton>
        </form>
      )}

      {kind === 'file' && (
        <form action={fileAction} noValidate className="mt-4 space-y-3">
          <input type="hidden" name="botId" value={botId} />
          <div>
            <label htmlFor="file" className="sr-only">
              Document
            </label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".pdf,.docx,.md,.txt"
              className="file:border-line file:bg-surface w-full text-sm file:mr-3 file:rounded-lg file:border file:px-3 file:py-1.5 file:text-sm"
            />
          </div>
          <FieldError id="file-error">{fileState.error}</FieldError>
          <SubmitButton pendingLabel="Uploading…">Upload</SubmitButton>
        </form>
      )}

      {kind === 'text' && (
        <form action={textAction} noValidate className="mt-4 space-y-3">
          <input type="hidden" name="botId" value={botId} />
          <Field
            name="title"
            label="Title"
            hideLabel
            maxLength={200}
            placeholder="Refund policy"
            schema={addTextSourceSchema.shape.title}
          />
          <Field
            name="content"
            label="Text"
            hideLabel
            multiline
            rows={8}
            placeholder="Paste the text here. Markdown headings help us cite it precisely."
            schema={addTextSourceSchema.shape.content}
            className="resize-y"
          />
          <FieldError id="text-error">{textState.error}</FieldError>
          <SubmitButton pendingLabel="Saving…">Add text</SubmitButton>
        </form>
      )}
    </section>
  );
}

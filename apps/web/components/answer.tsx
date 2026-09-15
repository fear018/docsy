'use client';

import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface CitationRef {
  index: number;
  title: string | null;
  headingPath: string | null;
  url: string | null;
}

/**
 * Renders an answer with its citation markers turned into links.
 *
 * Code is shown verbatim in a scrollable block: in dev-tools documentation the
 * snippet is the answer, and reflowing it would change what it means.
 */
export function Answer({ text, citations }: { text: string; citations: CitationRef[] }) {
  const byIndex = new Map(citations.map((citation) => [citation.index, citation]));

  return (
    <div className="space-y-3 text-[15px] leading-relaxed">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="[&:not(:first-child)]:mt-3">{withRefs(children)}</p>,
          li: ({ children }) => <li className="ml-4 list-disc">{withRefs(children)}</li>,
          ol: ({ children }) => <ol className="mt-2 space-y-1">{children}</ol>,
          ul: ({ children }) => <ul className="mt-2 space-y-1">{children}</ul>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="text-brand underline underline-offset-2"
            >
              {children}
            </a>
          ),
          code: ({ className, children }) =>
            className?.startsWith('language-') ? (
              <code className={className}>{children}</code>
            ) : (
              <code className="border-line bg-surface rounded border px-1 py-0.5 text-[13px]">
                {children}
              </code>
            ),
          pre: ({ children }) => (
            <pre className="border-line bg-surface mt-3 overflow-x-auto rounded-lg border p-3 text-[13px] leading-normal">
              {children}
            </pre>
          ),
        }}
      >
        {text}
      </Markdown>

      {citations.length > 0 && (
        <ul className="border-line mt-4 space-y-1 border-t pt-3">
          {citations.map((citation) => (
            <li key={citation.index} className="text-sm">
              <span className="text-muted mr-1.5">[{citation.index}]</span>
              {citation.url ? (
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="hover:text-brand underline-offset-2 hover:underline"
                >
                  {citation.headingPath ?? citation.title ?? citation.url}
                </a>
              ) : (
                <span>{citation.headingPath ?? citation.title ?? 'Source'}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  /** Turns bare [1] markers in the prose into anchors to the citation list. */
  function withRefs(children: React.ReactNode): React.ReactNode {
    return Array.isArray(children)
      ? children.map((child, i) => (typeof child === 'string' ? markRefs(child, i) : child))
      : typeof children === 'string'
        ? markRefs(children, 0)
        : children;
  }

  function markRefs(text: string, key: number): React.ReactNode {
    const parts = text.split(/(\[\d{1,2}\])/g);
    if (parts.length === 1) return text;
    return parts.map((part, i) => {
      const match = part.match(/^\[(\d{1,2})\]$/);
      const citation = match ? byIndex.get(Number(match[1])) : undefined;
      if (!citation) return part;
      return citation.url ? (
        <a
          key={`${key}-${i}`}
          href={citation.url}
          target="_blank"
          rel="noreferrer noopener"
          title={citation.headingPath ?? undefined}
          className="text-brand align-super text-[11px] no-underline hover:underline"
        >
          [{citation.index}]
        </a>
      ) : (
        <span key={`${key}-${i}`} className="text-muted align-super text-[11px]">
          [{citation.index}]
        </span>
      );
    });
  }
}

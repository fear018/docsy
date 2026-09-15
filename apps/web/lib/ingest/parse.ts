import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

/**
 * Everything becomes markdown before chunking, so the chunker has one input
 * shape and headings survive from every source type.
 */

export interface ParsedDocument {
  title: string | null;
  markdown: string;
}

/** Page furniture that carries no answer and would pollute every chunk. */
const STRIP_SELECTORS = [
  'script',
  'style',
  'noscript',
  'nav',
  'header',
  'footer',
  'aside',
  'form',
  'iframe',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  '[aria-hidden="true"]',
  '.sidebar',
  '.toc',
  '.table-of-contents',
  '.breadcrumb',
  '.pagination',
  '.edit-this-page',
  '.skip-link',
  // Permalink markers rendered inside headings; they end up in the heading path
  // and therefore in every citation label.
  '.anchor',
  '.header-anchor',
  '.headerlink',
  'a[aria-label="Permalink"]',
  'a[aria-label*="anchor" i]',
  // Feedback and related-content widgets that follow the page body.
  '[class*="feedback" i]',
  '[id*="feedback" i]',
  '[class*="was-this-helpful" i]',
];

/** Where documentation sites actually keep the page body, best guess first. */
const CONTENT_SELECTORS = ['main', 'article', '[role="main"]', '#content', '.content', 'body'];

/** 'Database | Supabase Docs' -> 'Database'. The suffix is the site, not the page. */
function pageHeading(title: string): string {
  const parts = title.split(/\s+[|—·–]\s+/);
  return (parts.length === 2 ? parts[0] : title)?.trim() ?? title;
}

function turndown(): TurndownService {
  const service = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });

  // Turndown drops the language, which is exactly the hint a developer reading
  // the citation needs.
  service.addRule('fencedCodeWithLanguage', {
    filter: (node) => node.nodeName === 'PRE' && node.firstChild?.nodeName === 'CODE',
    replacement: (_content, node) => {
      const code = (node as HTMLElement).querySelector('code');
      const className = code?.getAttribute('class') ?? '';
      const language = className.match(/language-([\w+-]+)/)?.[1] ?? '';
      const text = code?.textContent ?? '';
      return `\n\n\`\`\`${language}\n${text.replace(/\n$/, '')}\n\`\`\`\n\n`;
    },
  });

  // Tables survive as pipe tables; the default turns them into a run-on line.
  service.addRule('keepTables', {
    filter: ['table'],
    replacement: (_content, node) => {
      const rows = Array.from((node as HTMLElement).querySelectorAll('tr'));
      const lines = rows.map(
        (row) =>
          `| ${Array.from(row.querySelectorAll('th, td'))
            .map((cell) => (cell.textContent ?? '').trim().replace(/\|/g, '\\|'))
            .join(' | ')} |`,
      );
      if (lines.length > 1) {
        const columns = (lines[0]?.match(/\|/g)?.length ?? 2) - 1;
        lines.splice(1, 0, `|${' --- |'.repeat(columns)}`);
      }
      return `\n\n${lines.join('\n')}\n\n`;
    },
  });

  return service;
}

export function htmlToMarkdown(html: string): ParsedDocument {
  const $ = cheerio.load(html);
  const title =
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('h1').first().text().trim() ||
    $('title').text().trim() ||
    null;

  $(STRIP_SELECTORS.join(',')).remove();

  // Some sites render the permalink as a bare '#' link rather than a class we
  // can target, so drop those from headings too.
  $('h1, h2, h3, h4, h5, h6').each((_, heading) => {
    $(heading)
      .find('a')
      .filter((_i, link) => $(link).text().trim() === '#')
      .remove();
  });

  const root = CONTENT_SELECTORS.map((selector) => $(selector).first()).find(
    (element) => element.length > 0 && element.text().trim().length > 0,
  );

  let markdown = turndown()
    .turndown(root ? ($.html(root) ?? '') : ($.html() ?? ''))
    // Permalink leftovers such as '[#](#install)' trailing a heading.
    .replace(/\s*\[#\]\([^)]*\)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Documentation sites often render the page title outside the content
  // element. Without a top-level heading every chunk's path starts with a gap,
  // and the citation label loses the page it came from.
  if (title && !/^#\s/.test(markdown)) {
    const heading = pageHeading(title);
    const firstLine = markdown.split('\n', 1)[0]?.trim() ?? '';
    // The page often repeats its title as the first line of the body; promote
    // that line instead of adding a second copy above it.
    markdown =
      firstLine === heading
        ? `# ${heading}${markdown.slice(firstLine.length)}`
        : `# ${heading}\n\n${markdown}`;
  }

  return { title, markdown };
}

export class UnreadableFileError extends Error {}

export async function pdfToMarkdown(data: Uint8Array): Promise<ParsedDocument> {
  const { extractText, getDocumentProxy } = await import('unpdf');

  let text: string | string[];
  try {
    const pdf = await getDocumentProxy(data);
    ({ text } = await extractText(pdf, { mergePages: true }));
  } catch {
    // The library's own wording — "Invalid PDF structure" — is about its
    // parser, not about anything the owner can act on.
    throw new UnreadableFileError(
      'We could not open that PDF. It may be damaged or password-protected.',
    );
  }

  // A PDF carries no heading structure we can trust, so the text is passed
  // through as prose and the chunker splits it by size.
  return {
    title: null,
    markdown: String(text)
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  };
}

export async function docxToMarkdown(buffer: Buffer): Promise<ParsedDocument> {
  const mammoth = await import('mammoth');
  // Via HTML rather than raw text: mammoth maps Word heading styles to h1..h6,
  // which is the structure the chunker needs.
  const { value } = await mammoth.convertToHtml({ buffer });
  return htmlToMarkdown(value);
}

export function plainTextToMarkdown(text: string, filename?: string): ParsedDocument {
  const trimmed = text.replace(/\r\n/g, '\n').trim();
  const heading = trimmed.match(/^#{1,6}\s+(.*)$/m)?.[1]?.trim();
  return {
    title: heading ?? filename?.replace(/\.[^.]+$/, '') ?? null,
    markdown: trimmed,
  };
}

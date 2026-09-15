import * as cheerio from 'cheerio';

/**
 * Discovers and fetches documentation pages.
 *
 * Crawling someone else's site is done politely: robots.txt is honoured, the
 * concurrency is small, and every request is capped in both time and size so a
 * single hostile or broken page cannot stall an import.
 */

const USER_AGENT = 'DocsyBot/1.0 (+https://docsy-web-ivory.vercel.app)';
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_PAGE_BYTES = 5 * 1024 * 1024;
const CONCURRENCY = 5;

export interface FetchedPage {
  url: string;
  html: string;
}

export class FetchError extends Error {
  constructor(
    message: string,
    readonly url: string,
  ) {
    super(message);
  }
}

/** Turns a failure into something the owner can act on, not a status code. */
function describeFailure(status: number): string {
  if (status === 401 || status === 403) return 'That page is behind a login.';
  if (status === 404) return 'That page does not exist.';
  if (status === 429) return 'The site asked us to slow down. Try again later.';
  if (status >= 500) return 'The site returned an error.';
  return `The site responded with status ${status}.`;
}

async function request(url: string, accept: string): Promise<Response> {
  const response = await fetch(url, {
    headers: { 'user-agent': USER_AGENT, accept },
    redirect: 'follow',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new FetchError(describeFailure(response.status), url);
  return response;
}

export async function fetchPage(url: string): Promise<FetchedPage> {
  const response = await request(url, 'text/html,application/xhtml+xml');

  const type = response.headers.get('content-type') ?? '';
  if (!/text\/html|xhtml|text\/plain|text\/markdown/.test(type)) {
    throw new FetchError('That address is not a web page.', url);
  }

  const length = Number(response.headers.get('content-length') ?? 0);
  if (length > MAX_PAGE_BYTES) throw new FetchError('That page is too large to index.', url);

  const html = await response.text();
  if (html.length > MAX_PAGE_BYTES) throw new FetchError('That page is too large to index.', url);

  // response.url reflects redirects, so citations point where the reader lands.
  return { url: response.url || url, html };
}

/** Sitemap URLs declared in robots.txt, plus whether the path is allowed. */
export interface Robots {
  sitemaps: string[];
  disallowed: string[];
}

export function parseRobots(text: string): Robots {
  const sitemaps: string[] = [];
  const disallowed: string[] = [];
  let appliesToUs = false;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.split('#')[0]?.trim() ?? '';
    const [rawKey, ...rest] = line.split(':');
    const key = rawKey?.trim().toLowerCase();
    const value = rest.join(':').trim();
    if (!key || !value) continue;

    if (key === 'sitemap') sitemaps.push(value);
    else if (key === 'user-agent') appliesToUs = value === '*' || /docsy/i.test(value);
    else if (key === 'disallow' && appliesToUs) disallowed.push(value);
  }

  return { sitemaps, disallowed };
}

export function isAllowed(robots: Robots, url: string): boolean {
  const { pathname } = new URL(url);
  // An empty Disallow means "allow everything", per the standard.
  return !robots.disallowed.some((rule) => rule !== '' && pathname.startsWith(rule));
}

export function parseSitemap(xml: string): { pages: string[]; nested: string[] } {
  const $ = cheerio.load(xml, { xml: true });
  const pages: string[] = [];
  const nested: string[] = [];

  // Braces on purpose: cheerio's each() types the return as boolean | void, and
  // an expression body would return push()'s number.
  $('sitemapindex > sitemap > loc').each((_, el) => {
    nested.push($(el).text().trim());
  });
  $('urlset > url > loc').each((_, el) => {
    pages.push($(el).text().trim());
  });

  return { pages, nested };
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await request(url, 'application/xml,text/xml,text/plain');
    return await response.text();
  } catch {
    return null;
  }
}

/**
 * Collects the page URLs of a site: robots.txt first, then the conventional
 * sitemap location, following one level of sitemap index.
 */
export async function discoverUrls(
  startUrl: string,
  options: { pathPrefix?: string; limit: number },
): Promise<{ urls: string[]; robots: Robots }> {
  const origin = new URL(startUrl).origin;
  const robotsText = (await fetchText(`${origin}/robots.txt`)) ?? '';
  const robots = parseRobots(robotsText);

  const candidates = [...robots.sitemaps, `${origin}/sitemap.xml`];
  const seen = new Set<string>();
  const found: string[] = [];

  // Collect from every sitemap before applying the limit. Capping while still
  // gathering means a large first sitemap can exhaust the budget and the crawl
  // never reaches the one that actually holds the documentation.
  for (const candidate of candidates) {
    const xml = await fetchText(candidate);
    if (!xml) continue;

    const { pages, nested } = parseSitemap(xml);
    const all = [...pages];

    for (const child of nested.slice(0, 20)) {
      const childXml = await fetchText(child);
      if (childXml) all.push(...parseSitemap(childXml).pages);
    }

    for (const url of all) {
      if (seen.has(url)) continue;
      seen.add(url);
      found.push(url);
    }
  }

  const prefix = options.pathPrefix?.trim();
  const filtered = found.filter((url) => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return false;
    }
    if (parsed.origin !== origin) return false;
    if (prefix && !parsed.pathname.startsWith(prefix)) return false;
    return isAllowed(robots, url);
  });

  // No sitemap is common on small sites; indexing the entry page alone still
  // gives the owner something rather than an error.
  if (filtered.length === 0) return { urls: [startUrl], robots };

  return { urls: filtered.slice(0, options.limit), robots };
}

/** Runs `worker` over `items`, a few at a time, without failing the batch. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  concurrency = CONCURRENCY,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let cursor = 0;

  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      const item = items[index]!;
      try {
        results[index] = { status: 'fulfilled', value: await worker(item) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

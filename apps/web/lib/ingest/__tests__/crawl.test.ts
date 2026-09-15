import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseRobots, isAllowed, parseSitemap, mapWithConcurrency } from '../crawl';

describe('parseRobots', () => {
  it('collects sitemap declarations', () => {
    const robots = parseRobots(
      'Sitemap: https://acme.com/sitemap.xml\nSitemap: https://acme.com/docs-sitemap.xml',
    );
    assert.deepEqual(robots.sitemaps, [
      'https://acme.com/sitemap.xml',
      'https://acme.com/docs-sitemap.xml',
    ]);
  });

  it('applies rules for * and ignores rules aimed at other bots', () => {
    const robots = parseRobots(
      ['User-agent: *', 'Disallow: /admin', '', 'User-agent: GPTBot', 'Disallow: /'].join('\n'),
    );
    assert.ok(!isAllowed(robots, 'https://acme.com/admin/users'));
    assert.ok(isAllowed(robots, 'https://acme.com/docs/start'));
  });

  it('treats an empty Disallow as allow everything', () => {
    const robots = parseRobots('User-agent: *\nDisallow:');
    assert.ok(isAllowed(robots, 'https://acme.com/anything'));
  });

  it('ignores comments', () => {
    const robots = parseRobots('# Sitemap: https://evil.com/s.xml\nUser-agent: *\nDisallow: /x');
    assert.deepEqual(robots.sitemaps, []);
    assert.ok(!isAllowed(robots, 'https://acme.com/x/y'));
  });
});

describe('parseSitemap', () => {
  it('reads page urls', () => {
    const { pages, nested } = parseSitemap(
      `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://acme.com/docs/a</loc></url>
        <url><loc>https://acme.com/docs/b</loc></url>
      </urlset>`,
    );
    assert.deepEqual(pages, ['https://acme.com/docs/a', 'https://acme.com/docs/b']);
    assert.deepEqual(nested, []);
  });

  it('reads a sitemap index separately from pages', () => {
    const { pages, nested } = parseSitemap(
      `<?xml version="1.0"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <sitemap><loc>https://acme.com/sitemap-docs.xml</loc></sitemap>
      </sitemapindex>`,
    );
    assert.deepEqual(pages, []);
    assert.deepEqual(nested, ['https://acme.com/sitemap-docs.xml']);
  });

  it('returns nothing for malformed xml rather than throwing', () => {
    const { pages, nested } = parseSitemap('not xml at all');
    assert.deepEqual(pages, []);
    assert.deepEqual(nested, []);
  });
});

describe('mapWithConcurrency', () => {
  it('keeps results in input order and reports failures per item', async () => {
    const results = await mapWithConcurrency([1, 2, 3, 4], async (n) => {
      if (n === 3) throw new Error('boom');
      return n * 10;
    });
    assert.equal(results.length, 4);
    assert.deepEqual(
      results.map((r) => (r.status === 'fulfilled' ? r.value : 'failed')),
      [10, 20, 'failed', 40],
    );
  });

  it('never runs more than the limit at once', async () => {
    let active = 0;
    let peak = 0;
    await mapWithConcurrency(
      Array.from({ length: 20 }, (_, i) => i),
      async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
      },
      3,
    );
    assert.ok(peak <= 3, `peak concurrency was ${peak}`);
  });
});

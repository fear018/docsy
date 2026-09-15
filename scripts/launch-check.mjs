#!/usr/bin/env node
/**
 * Pre-launch checks against the deployed site.
 *
 *   node scripts/launch-check.mjs https://docsy-web-ivory.vercel.app
 *
 * Everything here is checked by making a request, not by reading config.
 * Configuration can say a key is present while the running site disagrees —
 * and Vercel will not return the value of a variable marked sensitive anyway,
 * so an inventory of names proves nothing.
 */

const base = (process.argv[2] ?? 'https://docsy-web-ivory.vercel.app').replace(/\/$/, '');
const results = [];

async function check(label, run) {
  try {
    const detail = await run();
    results.push({ ok: true, label, detail });
  } catch (error) {
    results.push({ ok: false, label, detail: error.message });
  }
}

const status = async (path, init) => (await fetch(base + path, init)).status;

const expect = (actual, wanted, what) => {
  const list = Array.isArray(wanted) ? wanted : [wanted];
  if (!list.includes(actual))
    throw new Error(`${what}: got ${actual}, wanted ${list.join(' or ')}`);
  return `${what}: ${actual}`;
};

await check('landing responds over https', async () => {
  if (!base.startsWith('https://')) throw new Error('not https');
  return expect(await status('/'), 200, 'GET /');
});

await check('legal pages exist', async () => {
  const privacy = await status('/privacy');
  const terms = await status('/terms');
  return expect(Math.max(privacy, terms), 200, '/privacy and /terms');
});

await check('signed-out visitors cannot reach the app', async () =>
  expect(await status('/bots', { redirect: 'manual' }), [307, 302], 'GET /bots'),
);

await check('cron refuses an unauthenticated call', async () =>
  expect(await status('/api/cron/maintenance'), 401, 'GET /api/cron/maintenance'),
);

await check('stripe webhook refuses an unsigned call', async () =>
  expect(
    await status('/api/stripe/webhook', { method: 'POST', body: '{}' }),
    400,
    'POST /api/stripe/webhook',
  ),
);

await check('widget loader is served and small', async () => {
  const response = await fetch(base + '/widget.js');
  const body = await response.text();
  if (response.status !== 200) throw new Error(`status ${response.status}`);
  if (body.length > 20_000) throw new Error(`${body.length} bytes is too large`);
  return `${body.length} bytes`;
});

await check('the demo bot on the landing answers', async () => {
  const key = process.env.NEXT_PUBLIC_DEMO_BOT_KEY;
  if (!key) throw new Error('NEXT_PUBLIC_DEMO_BOT_KEY not set locally, cannot test');
  const response = await fetch(base + '/api/public/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      publicKey: key,
      question: 'What is a connection pooler?',
      visitorId: `launch-check-${Date.now()}`,
      parentOrigin: base,
    }),
  });
  if (!response.ok) throw new Error(`status ${response.status}`);
  const first = (await response.text()).split('\n')[0] ?? '';
  const event = JSON.parse(first);
  if (event.type !== 'start') throw new Error('stream did not start');
  return `${event.passages.length} passages retrieved`;
});

await check('an unknown widget key reveals nothing', async () => {
  const response = await fetch(base + '/api/public/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      publicKey: 'pk_does_not_exist_000',
      question: 'hello',
      visitorId: 'launch-check',
      parentOrigin: base,
    }),
  });
  const { error } = await response.json();
  if (/not found|unknown|invalid key/i.test(error ?? '')) {
    throw new Error(`message leaks whether the key exists: "${error}"`);
  }
  return `404 with a neutral message`;
});

await check('no snippet points at localhost', async () => {
  // NEXT_PUBLIC_* are inlined at build time. A platform that hides a variable
  // from the build — Vercel does this for anything marked sensitive — leaves
  // the code falling back to its development default, and the install snippet
  // quietly tells every customer to load the widget from their own machine.
  const html = await (await fetch(base + '/')).text();
  if (/localhost|127\.0\.0\.1/.test(html)) {
    throw new Error('the page contains a localhost URL');
  }
  return 'landing has no localhost URL';
});

for (const { ok, label, detail } of results) {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
}

const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);

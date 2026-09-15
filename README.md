# Docsy

Turn product documentation into a chatbot that answers with citations — inside
the app, and as a one-line widget on the customer's own site.

**Live:** https://docsy-web-ivory.vercel.app

Built as a test project. Payments run in Stripe's test mode; no card is ever
charged.

## What it does

- **Indexes documentation by URL.** Follows the site's sitemap, filtered to a
  path like `/docs`. Files (PDF, DOCX, Markdown, text) and pasted notes work too.
- **Answers with citations.** Every answer links to the heading it came from. If
  the documentation does not cover something, it says so instead of inventing.
- **Embeds anywhere.** One `<script>` tag, a 1.1 kB loader, an isolated iframe.
- **Reports what the docs are missing.** Unanswered questions, grouped by
  wording, with counts. The part that stays useful even when the bot is wrong.
- **Bills on Stripe.** Three plans, quota enforced before the model is called,
  and a downgrade that freezes rather than deletes.

## Running it

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # then fill it in
pnpm db:start                                  # local Supabase in Docker
pnpm db:reset                                  # apply migrations
pnpm dev
```

`apps/web/.env.local` needs Supabase (URL, anon key, service role key), an
OpenAI key, and — for billing — Stripe test keys. The app runs without Stripe;
checkout is simply hidden.

```bash
pnpm test        # 64 unit tests
pnpm eval        # answer quality against a real indexed bot
pnpm db:push     # apply migrations to the hosted project
pnpm demo:site   # a hostile page for testing the widget on a foreign origin
```

## How it is put together

```
apps/web          Next.js: app, landing, API routes
packages/shared   plan limits, zod schemas, database types
packages/widget   the embed loader, no framework
supabase/         migrations, RLS policies, RLS assertions
evals/            30 questions and a runner
demo-site/        a page with deliberately hostile CSS
```

**Retrieval is hybrid.** Dense vectors plus Postgres full-text, merged with
reciprocal rank fusion. Vectors alone miss exact tokens — a flag name, an error
code — and in dev-tools documentation those are most of what people search for.

**Chunking follows headings and never splits code.** The heading path is what a
citation shows the reader, and half a snippet is worse than no answer.

**The public widget endpoint is the only unauthenticated surface.** It checks
the public key, the origin allowlist, a rate limit keyed by a salted hash — not
an IP — and the plan quota, all before the model is called.

## What was deliberately left out

Teams and roles · human handoff · Slack and Discord integrations · a localised
interface · user-selectable models · fine-tuning · a dashboard of charts ·
white-labelling and custom widget domains · documentation behind a login.

Each was cut to keep the scope honest rather than because it was hard. The last
one is the most likely to be missed: private docs must be exported and uploaded.

## Known limits

- Indexing continues while the tab is open; closing it pauses the import.
  Nightly upkeep picks up anything left stalled.
- The origin allowlist is a guard, not a security boundary — anything a browser
  reports can be forged by a client that is not a browser. The rate limit and
  quota are what cap the cost.
- Answers are as good as the documentation. The gap report exists because that
  is frequently the real problem.

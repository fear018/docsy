---
name: add-route
description: Add an API route handler to Docsy with the right Supabase client, input validation and error shape. Use when creating anything under apps/web/app/api.
---

# Adding a route handler

## Pick the client first

This decides the whole security posture of the route.

| Caller          | Client                   | Authorisation                                    |
| --------------- | ------------------------ | ------------------------------------------------ |
| Signed-in owner | `@/lib/supabase/server`  | RLS does it — do not filter by `user_id` by hand |
| Public widget   | `@/lib/supabase/service` | You do it: public key, Origin, quota             |
| Stripe webhook  | `@/lib/supabase/service` | Signature check, then idempotency                |
| Cron            | `@/lib/supabase/service` | `CRON_SECRET` compare                            |

The service-role client bypasses RLS completely. Every route that reaches for it
owes an explicit authorisation check as its first statements.

## Validate the input

Parse the body with a zod schema from `packages/shared`. Never read a field off
an unparsed body. Return 400 with a readable sentence, not the zod error object.

## Public widget routes, in this order

1. Look up the bot by `public_key`. Unknown key → 404, and say nothing about
   whether the key ever existed.
2. Compare the `Origin` header against the bot's `allowed_origins`. No match → 403.
3. Rate limit per visitor and per IP.
4. Check the plan quota **before** calling the model. Over quota → a polite
   message to the visitor, never a mention of billing. The site owner's payment
   status is not the visitor's business.

Skipping step 4 turns the free plan into unmetered spend on OpenAI.

## Shape of the response

Success returns the data. Failure returns `{ error: string }` with a sentence a
person can act on. No stack traces, no Postgres codes, no `error.message`
straight from a library.

Report unexpected failures to Sentry, return something readable to the caller.

## Before you finish

- The route is covered by `proxy.ts` unless it must work anonymously. `/embed`
  and `widget.js` are already excluded; add new public paths to that matcher.
- Long work does not belong in a request. Indexing runs in the background with
  status on the `sources` row.

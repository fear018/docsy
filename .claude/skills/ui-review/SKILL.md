---
name: ui-review
description: Review a Docsy screen before calling it done — states, width, theme, accessibility and copy. Use on any new or changed page or component.
---

# Reviewing a screen

A screen is not finished when the happy path renders. Walk this list and fix
what fails; do not defer items to a polish pass.

## States

- **Empty** — says what the thing is and what to do next, not "No data".
- **Loading** — no layout shift when content arrives.
- **Error** — a sentence a person can act on. Never a raw code, never
  "Something went wrong" with no next step.
- **Partial** — indexing in progress, quota nearly spent, subscription past due.

## Width

Works at 390px. Tables, code blocks and diagrams scroll inside their own
container so the page body never scrolls sideways.

## Theme

The palette is defined on `:root` in `globals.css` and overridden under
`prefers-color-scheme: dark`. No colour gets its only definition inside the
dark block. Check both.

## Accessibility

- Every input has a label, even a visually hidden one.
- Focus is visible and ordered sensibly.
- Anything overlaid traps focus and closes on Escape.
- Error text is tied to its field with `aria-describedby` and announced with
  `role="alert"`.
- Contrast is at least 4.5:1 for text.

## Copy

English, one voice, sentence case. Say what happened and what to do:
"That sign-in link has expired. Request a new one." — not "Auth error 401".

Never surface billing state to a widget visitor. They are the site owner's
customer and have no idea who Docsy is.

## Against the plan

Check `CLAUDE.md` before adding anything. The out-of-scope list is a decision
already made, not a backlog.

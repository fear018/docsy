'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Light, dark, or whatever the system says.
 *
 * The choice is stored in this browser only. There is no account setting for
 * it, because a theme belongs to the screen you are looking at, not to you —
 * the same person wants dark on a laptop at night and light on a monitor in an
 * office.
 */

export type Theme = 'light' | 'dark' | 'system';

export const THEME_KEY = 'docsy.theme';

/**
 * Runs before the first paint, inlined in the document head.
 *
 * Applying the stored theme from React would mean rendering the default first
 * and correcting it a moment later, which is a white flash on a dark screen.
 */
export const THEME_SCRIPT = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='dark'||t==='light'){document.documentElement.dataset.theme=t}}catch(e){}`;

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
  try {
    if (theme === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Private windows and blocked storage: the choice still applies to this
    // page, it just will not be remembered.
  }
}

/**
 * The theme lives on the document, not in React state.
 *
 * The inline script sets it before the first paint, so React's job is to read
 * what is already there rather than to decide it a moment later. Reading
 * external state this way also avoids setting state inside an effect, which
 * costs an extra render of the wrong theme.
 */
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): Theme {
  const set = document.documentElement.dataset.theme;
  return set === 'dark' || set === 'light' ? set : 'system';
}

/** The server cannot know what this browser chose. */
const serverSnapshot = (): Theme => 'system';

export function useTheme(): [Theme, (next: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, snapshot, serverSnapshot);

  const set = useCallback((next: Theme) => {
    apply(next);
    for (const listener of listeners) listener();
  }, []);

  return [theme, set];
}

const OPTIONS: { value: Theme; label: string; glyph: string }[] = [
  { value: 'light', label: 'Light', glyph: '☀' },
  { value: 'dark', label: 'Dark', glyph: '☾' },
  { value: 'system', label: 'System', glyph: '◐' },
];

export function ThemeToggle() {
  const [theme, setTheme] = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="border-line flex items-center gap-0.5 rounded-lg border p-0.5"
    >
      {OPTIONS.map((option) => {
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            title={option.label}
            onClick={() => setTheme(option.value)}
            className={`rounded-md px-2 py-1 text-sm leading-none transition ${
              active ? 'bg-surface text-fg' : 'text-muted hover:text-fg'
            }`}
          >
            <span aria-hidden>{option.glyph}</span>
          </button>
        );
      })}
    </div>
  );
}

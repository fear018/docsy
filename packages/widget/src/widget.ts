/**
 * Docsy embed loader.
 *
 * Deliberately tiny and framework-free: it is loaded on someone else's site,
 * where every kilobyte is a cost they did not choose. All it does is draw a
 * launcher and manage an iframe. The chat itself lives inside that iframe,
 * which is why the customer's CSS cannot reach it — the most common way an
 * embedded widget ends up looking broken.
 */

interface Options {
  botKey: string;
  origin: string;
  position: 'right' | 'left';
  accent: string;
  label: string;
}

const NAMESPACE = 'docsy';

function readOptions(): Options | null {
  const script =
    (document.currentScript as HTMLScriptElement | null) ??
    document.querySelector<HTMLScriptElement>('script[data-bot]');
  if (!script) return null;

  const botKey = script.getAttribute('data-bot');
  if (!botKey) return null;

  return {
    botKey,
    origin: new URL(script.src, location.href).origin,
    position: script.getAttribute('data-position') === 'left' ? 'left' : 'right',
    accent: script.getAttribute('data-accent') ?? '#3b6fd4',
    label: script.getAttribute('data-label') ?? 'Ask the docs',
  };
}

/** Object.assign onto a style needs a partial, not the full interface. */
type Styles = Partial<Record<keyof CSSStyleDeclaration, string>> & Record<string, string>;

function build(options: Options) {
  const side = options.position;

  const launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.setAttribute('aria-label', options.label);
  launcher.setAttribute('aria-expanded', 'false');
  Object.assign(launcher.style, {
    position: 'fixed',
    bottom: '20px',
    [side]: '20px',
    zIndex: '2147483000',
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    border: '0',
    cursor: 'pointer',
    background: options.accent,
    color: '#fff',
    boxShadow: '0 6px 24px rgba(0,0,0,.22)',
    display: 'grid',
    placeItems: 'center',
    font: '600 20px/1 system-ui, sans-serif',
    padding: '0',
  } satisfies Styles);
  launcher.textContent = '?';

  const frame = document.createElement('iframe');
  frame.title = options.label;
  frame.setAttribute('loading', 'lazy');
  // The frame only needs to run its own scripts and talk to its own origin.
  frame.setAttribute('allow', 'clipboard-write');
  Object.assign(frame.style, {
    position: 'fixed',
    bottom: '84px',
    [side]: '20px',
    zIndex: '2147483000',
    width: 'min(400px, calc(100vw - 40px))',
    height: 'min(620px, calc(100vh - 120px))',
    border: '0',
    borderRadius: '14px',
    background: '#fff',
    boxShadow: '0 12px 48px rgba(0,0,0,.24)',
    display: 'none',
    colorScheme: 'light dark',
  } satisfies Styles);

  // Phones: a 400px panel floating over a 390px screen is unusable.
  const phone = matchMedia('(max-width: 480px)');
  const applySize = () => {
    if (phone.matches) {
      Object.assign(frame.style, {
        inset: '0',
        width: '100%',
        height: '100%',
        borderRadius: '0',
      } satisfies Styles);
    }
  };
  phone.addEventListener('change', applySize);
  applySize();

  let loaded = false;
  let open = false;

  const setOpen = (next: boolean) => {
    open = next;
    if (open && !loaded) {
      // Loaded on first use, so a page that never opens the widget pays nothing.
      const url = new URL(`/embed/${encodeURIComponent(options.botKey)}`, options.origin);
      url.searchParams.set('o', location.origin);
      frame.src = url.toString();
      loaded = true;
    }
    frame.style.display = open ? 'block' : 'none';
    launcher.setAttribute('aria-expanded', String(open));
    launcher.textContent = open ? '×' : '?';
    if (open) frame.focus();
  };

  launcher.addEventListener('click', () => setOpen(!open));

  addEventListener('message', (event) => {
    if (event.origin !== options.origin) return;
    if ((event.data as { type?: string })?.type === `${NAMESPACE}:close`) {
      setOpen(false);
      launcher.focus();
    }
  });

  addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open) {
      setOpen(false);
      launcher.focus();
    }
  });

  document.body.append(frame, launcher);

  return {
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen(!open),
  };
}

function start() {
  const options = readOptions();
  if (!options) return;
  const api = build(options);
  (window as unknown as Record<string, unknown>).Docsy = api;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}

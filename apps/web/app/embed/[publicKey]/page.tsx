import type { Metadata } from 'next';
import { createServiceClient } from '@/lib/supabase/service';
import { WidgetChat } from './widget-chat';

export const metadata: Metadata = {
  title: 'Assistant',
  // Never index the embedded frame itself.
  robots: { index: false, follow: false },
};

export interface WidgetConfig {
  title?: string;
  greeting?: string;
  accent?: string;
  starters?: string[];
}

export default async function EmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicKey: string }>;
  searchParams: Promise<{
    o?: string;
    /** Presentation overrides, used by the settings preview only. */
    title?: string;
    accent?: string;
    greeting?: string;
    starters?: string;
    theme?: string;
    /** Marks the frame as the settings preview, which may repaint it live. */
    preview?: string;
  }>;
}) {
  const { publicKey } = await params;
  const { o: parentOrigin, ...preview } = await searchParams;

  // Service role on purpose: there is no session here. Nothing sensitive is
  // read — only the bot's public appearance, found by its public key.
  const supabase = createServiceClient();
  const { data: rows } = await supabase.rpc('bot_by_public_key', { p_public_key: publicKey });
  const bot = rows?.[0];

  if (!bot) {
    return (
      <main className="grid min-h-dvh place-items-center p-6 text-center">
        <p className="text-muted text-sm">This assistant is unavailable.</p>
      </main>
    );
  }

  const saved = (bot.widget_config ?? {}) as WidgetConfig;

  /**
   * The settings page renders this same route as its preview, passing the
   * values being edited so they show before they are saved. Appearance only —
   * nothing here changes what the bot answers or who may ask it, and the
   * override affects the one browser that opened the URL.
   */
  // Only the settings preview sends this. On a customer's site the widget
  // follows the visitor's own system setting, because it is their screen and
  // they have never heard of us.
  const forcedTheme = preview.theme === 'dark' || preview.theme === 'light' ? preview.theme : null;
  const livePreview = preview.preview === '1';

  const config: WidgetConfig = {
    title: preview.title ?? saved.title,
    accent: /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(preview.accent ?? '')
      ? preview.accent
      : saved.accent,
    greeting: preview.greeting ?? saved.greeting,
    starters: preview.starters ? preview.starters.split('\n').filter(Boolean) : saved.starters,
  };
  const showBranding = bot.plan === 'free' || bot.subscription_status === null;

  return (
    <WidgetChat
      theme={forcedTheme}
      publicKey={publicKey}
      parentOrigin={parentOrigin ?? null}
      config={config}
      showBranding={showBranding}
      livePreview={livePreview}
    />
  );
}

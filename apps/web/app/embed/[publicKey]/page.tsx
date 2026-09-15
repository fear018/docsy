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
  searchParams: Promise<{ o?: string }>;
}) {
  const { publicKey } = await params;
  const { o: parentOrigin } = await searchParams;

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

  const config = (bot.widget_config ?? {}) as WidgetConfig;
  const showBranding = bot.plan === 'free' || bot.subscription_status === null;

  return (
    <WidgetChat
      publicKey={publicKey}
      parentOrigin={parentOrigin ?? null}
      config={config}
      showBranding={showBranding}
    />
  );
}

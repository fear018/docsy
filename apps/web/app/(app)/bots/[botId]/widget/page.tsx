import { notFound } from 'next/navigation';
import { effectivePlan } from '@docsy/shared';
import { createClient } from '@/lib/supabase/server';
import { publicEnv } from '@/lib/env';
import { WidgetSettings } from './widget-settings';

interface StoredConfig {
  title?: string;
  greeting?: string | null;
  accent?: string;
  position?: 'right' | 'left';
  starters?: string[];
}

export default async function WidgetPage({ params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params;
  const supabase = await createClient();

  const { data: bot } = await supabase
    .from('bots')
    .select('id, public_key, widget_config, allowed_origins')
    .eq('id', botId)
    .maybeSingle();

  if (!bot) notFound();

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .maybeSingle();
  const plan = effectivePlan(subscription?.plan, subscription?.status);

  const config = (bot.widget_config ?? {}) as StoredConfig;

  return (
    <WidgetSettings
      botId={bot.id}
      publicKey={bot.public_key}
      title={config.title ?? 'Ask the docs'}
      greeting={config.greeting ?? ''}
      accent={config.accent ?? '#3b6fd4'}
      position={config.position === 'left' ? 'left' : 'right'}
      starters={config.starters ?? []}
      allowedOrigins={bot.allowed_origins ?? []}
      fullCustomisation={plan.features.widgetCustomisation === 'full'}
      appUrl={publicEnv.NEXT_PUBLIC_APP_URL}
    />
  );
}

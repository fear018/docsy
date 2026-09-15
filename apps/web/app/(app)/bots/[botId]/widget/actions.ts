'use server';

import { revalidatePath } from 'next/cache';
import { widgetConfigSchema, effectivePlan } from '@docsy/shared';
import { createClient } from '@/lib/supabase/server';
import { getEntitlements, isReadOnly } from '@/lib/billing/entitlements';

export interface WidgetState {
  error?: string;
  saved?: boolean;
}

/** Strips a pasted URL down to the host the allowlist compares against. */
function toHost(value: string): string | null {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(cleaned) ? cleaned : null;
}

export async function saveWidgetConfig(
  _prev: WidgetState,
  formData: FormData,
): Promise<WidgetState> {
  const parsed = widgetConfigSchema.safeParse({
    botId: formData.get('botId'),
    title: formData.get('title'),
    greeting: formData.get('greeting') ?? '',
    accent: formData.get('accent'),
    position: formData.get('position'),
    starters: formData
      .getAll('starter')
      .map(String)
      .filter((value) => value.trim() !== ''),
    allowedOrigins: String(formData.get('allowedOrigins') ?? '')
      .split(/[\n,]/)
      .map((value) => value.trim())
      .filter(Boolean),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form and try again.' };
  }

  const supabase = await createClient();
  const entitlements = await getEntitlements(supabase);
  if (isReadOnly(entitlements, parsed.data.botId)) {
    return { error: 'This bot is above what your plan covers. Upgrade to change its widget.' };
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .maybeSingle();
  const plan = effectivePlan(subscription?.plan, subscription?.status);

  const hosts: string[] = [];
  for (const entry of parsed.data.allowedOrigins) {
    const host = toHost(entry);
    if (!host) return { error: `"${entry}" is not a domain. Use something like acme.com.` };
    hosts.push(host);
  }

  // On the basic tier only the two fields that make the widget look like the
  // customer's own are editable; the rest keep their defaults.
  const full = plan.features.widgetCustomisation === 'full';

  const { error } = await supabase
    .from('bots')
    .update({
      widget_config: {
        title: parsed.data.title,
        accent: parsed.data.accent,
        position: full ? parsed.data.position : 'right',
        greeting: full ? parsed.data.greeting || null : null,
        starters: full ? parsed.data.starters : [],
      },
      allowed_origins: hosts,
    })
    .eq('id', parsed.data.botId);

  if (error) return { error: 'We could not save those settings. Try again in a moment.' };

  revalidatePath(`/bots/${parsed.data.botId}/widget`);
  return { saved: true };
}

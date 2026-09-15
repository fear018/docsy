'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createBotSchema, renameBotSchema, botIdSchema, getPlan, PLANS } from '@docsy/shared';
import { createClient } from '@/lib/supabase/server';

export interface ActionState {
  error?: string;
}

export async function createBot(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createBotSchema.safeParse({ name: formData.get('name') });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the name and try again.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Enforce the plan's bot limit before inserting. RLS scopes the count to the
  // owner, so no user_id filter is needed here.
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .maybeSingle();
  const plan = getPlan(subscription?.plan ?? 'free');
  const { count } = await supabase.from('bots').select('id', { count: 'exact', head: true });

  if ((count ?? 0) >= plan.limits.bots) {
    const next = plan.id === 'free' ? PLANS.pro : PLANS.business;
    return {
      error: `The ${plan.name} plan covers ${plan.limits.bots} bot${
        plan.limits.bots === 1 ? '' : 's'
      }. ${next.name} raises that to ${next.limits.bots}.`,
    };
  }

  const { data: bot, error } = await supabase
    .from('bots')
    .insert({ user_id: user.id, name: parsed.data.name })
    .select('id')
    .single();

  if (error || !bot) {
    return { error: 'We could not create the bot. Try again in a moment.' };
  }

  revalidatePath('/bots');
  redirect(`/bots/${bot.id}/sources`);
}

export async function renameBot(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = renameBotSchema.safeParse({
    botId: formData.get('botId'),
    name: formData.get('name'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the name and try again.' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('bots')
    .update({ name: parsed.data.name })
    .eq('id', parsed.data.botId);

  if (error) return { error: 'We could not rename the bot. Try again in a moment.' };

  revalidatePath(`/bots/${parsed.data.botId}`);
  revalidatePath('/bots');
  return {};
}

export async function deleteBot(formData: FormData) {
  const parsed = botIdSchema.safeParse({ botId: formData.get('botId') });
  if (!parsed.success) redirect('/bots');

  const supabase = await createClient();
  // Documents, chunks, sources and conversations cascade from the bot row.
  // Stored files are removed separately: Storage has no foreign keys.
  const { data: files } = await supabase
    .from('sources')
    .select('storage_path')
    .eq('bot_id', parsed.data.botId)
    .not('storage_path', 'is', null);

  await supabase.from('bots').delete().eq('id', parsed.data.botId);

  const paths = (files ?? []).map((f) => f.storage_path).filter((p): p is string => Boolean(p));
  if (paths.length > 0) await supabase.storage.from('sources').remove(paths);

  revalidatePath('/bots');
  redirect('/bots');
}

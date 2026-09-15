'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const idSchema = z.object({ conversationId: z.uuid(), botId: z.uuid() });

export async function deleteConversation(formData: FormData) {
  const parsed = idSchema.safeParse({
    conversationId: formData.get('conversationId'),
    botId: formData.get('botId'),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  // RLS scopes the delete to the owner's own bots; messages cascade.
  await supabase.from('conversations').delete().eq('id', parsed.data.conversationId);
  revalidatePath(`/bots/${parsed.data.botId}/chat`);
}

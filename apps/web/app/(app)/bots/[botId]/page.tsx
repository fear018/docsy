import { redirect } from 'next/navigation';

export default async function BotIndexPage({ params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params;
  redirect(`/bots/${botId}/sources`);
}

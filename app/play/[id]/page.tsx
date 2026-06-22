import { GameApp } from '@/components/GameApp';

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GameApp initialScreen="match" initialMatchId={id} />;
}

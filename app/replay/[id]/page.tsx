import { ReplayViewer } from '@/components/ReplayViewer';

export default async function ReplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReplayViewer replayId={id} />;
}

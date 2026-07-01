import { NextResponse } from 'next/server';
import { findReplaySnapshot } from '@/lib/server/store';

const REPLAYS_ENABLED = process.env.MATIMATO_REPLAYS_ENABLED !== 'false';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!REPLAYS_ENABLED) throw new Error('REPLAY_UNAVAILABLE');
    const { id } = await params;
    const replay = await findReplaySnapshot(id);
    return NextResponse.json(
      { replay },
      { headers: { 'cache-control': 'public, max-age=60, stale-while-revalidate=300' } }
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : 'REPLAY_UNAVAILABLE';
    const status = code === 'REPLAY_NOT_FOUND' ? 404 : code === 'REPLAY_NOT_COMPLETE' ? 409 : code === 'REPLAY_PRIVATE' || code === 'REPLAY_EXPIRED' ? 403 : 503;
    return NextResponse.json({ error: code }, { status, headers: { 'cache-control': 'no-store' } });
  }
}

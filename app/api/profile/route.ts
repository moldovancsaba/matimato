import { fail, ok } from '@/lib/server/http';
import { getProfile } from '@/lib/server/store';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const playerId = url.searchParams.get('playerId');
    const tag = url.searchParams.get('tag') || 'Player';
    if (!playerId) throw new Error('Missing playerId.');
    return ok({ profile: await getProfile(playerId, tag) });
  } catch (error) {
    return fail(error, 400);
  }
}

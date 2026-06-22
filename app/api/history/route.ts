import { fail, ok } from '@/lib/server/http';
import { getHistory } from '@/lib/server/store';

export async function GET(request: Request) {
  try {
    const playerId = new URL(request.url).searchParams.get('playerId');
    if (!playerId) throw new Error('Missing playerId.');
    return ok({ history: await getHistory(playerId) });
  } catch (error) {
    return fail(error, 400);
  }
}

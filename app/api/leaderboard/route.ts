import { fail, ok } from '@/lib/server/http';
import { getLeaderboard } from '@/lib/server/store';

export async function GET() {
  try {
    return ok({ leaderboard: await getLeaderboard() });
  } catch (error) {
    return fail(error, 400);
  }
}

import { ok, fail } from '@/lib/server/http';
import { getDb } from '@/lib/server/mongo';

export async function GET() {
  try {
    await getDb();
    return ok({ ok: true, database: 'connected' });
  } catch (error) {
    return fail(error, 503);
  }
}

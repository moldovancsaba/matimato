import { ok, fail } from '@/lib/server/http';
import { getDb } from '@/lib/server/mongo';
import type { HealthResponse } from '@/lib/shared/types';
import pkg from '@/package.json';

export async function GET() {
  const started = Date.now();
  try {
    await getDb();
    return ok({
      ok: true,
      database: 'connected',
      version: pkg.version,
      checks: [{ name: 'mongodb', status: 'ok', latencyMs: Date.now() - started }]
    } satisfies HealthResponse);
  } catch (error) {
    const response: HealthResponse = {
      ok: false,
      database: 'error',
      version: pkg.version,
      checks: [{ name: 'mongodb', status: 'error', latencyMs: Date.now() - started }]
    };
    return fail(error, 503, response);
  }
}

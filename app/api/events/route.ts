import { fail, ok } from '@/lib/server/http';
import { ingestTelemetryPayload } from '@/lib/server/telemetry';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const result = await ingestTelemetryPayload(rawBody);
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}

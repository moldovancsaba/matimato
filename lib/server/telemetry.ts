import { z } from 'zod';
import { isAllowedTelemetryProperty, TELEMETRY_EVENT_NAMES } from '@/lib/shared/telemetry';
import type { TelemetryEvent, TelemetryIngestResponse } from '@/lib/shared/types';
import { getDb } from './mongo';

const EVENTS = 'events';
const MAX_EVENTS = 50;
const MAX_BYTES = 32 * 1024;

const propertyValueSchema = z.union([z.string().max(120), z.number().finite(), z.boolean(), z.null()]);
const telemetryEventSchema = z.object({
  name: z.enum(TELEMETRY_EVENT_NAMES),
  version: z.literal(1),
  occurredAt: z.string().datetime(),
  sessionHash: z.string().regex(/^[a-f0-9]{8,64}$/),
  playerHash: z.string().regex(/^[a-f0-9]{8,64}$/).optional(),
  matchHash: z.string().regex(/^[a-f0-9]{8,64}$/).optional(),
  phase: z.string().max(60).optional(),
  durationMs: z.number().int().min(0).max(24 * 60 * 60 * 1000).optional(),
  result: z.enum(['ok', 'error', 'cancelled']).optional(),
  properties: z.record(z.string(), propertyValueSchema)
});

export function sanitizeTelemetryEvent(input: unknown): TelemetryEvent | null {
  const parsed = telemetryEventSchema.safeParse(input);
  if (!parsed.success) return null;
  const event = parsed.data;
  const properties = Object.fromEntries(
    Object.entries(event.properties)
      .filter(([key]) => isAllowedTelemetryProperty(key))
      .map(([key, value]) => [key, typeof value === 'string' ? redactText(value) : value])
  );
  return { ...event, properties };
}

export async function ingestTelemetryPayload(rawBody: string): Promise<TelemetryIngestResponse> {
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BYTES) throw new Error('Telemetry payload too large.');
  const parsed = z.object({ events: z.array(z.unknown()).max(MAX_EVENTS) }).parse(JSON.parse(rawBody));
  const accepted: TelemetryEvent[] = [];
  let rejected = 0;
  for (const input of parsed.events) {
    const event = sanitizeTelemetryEvent(input);
    if (!event) rejected += 1;
    else accepted.push(event);
  }
  if (!accepted.length) return { accepted: 0, rejected };
  if (process.env.MATIMATO_EVENTS_ENABLED === 'false') return { accepted: accepted.length, rejected, degraded: true };
  try {
    const db = await getDb();
    await db.collection<TelemetryEvent>(EVENTS).insertMany(accepted, { ordered: false });
    return { accepted: accepted.length, rejected };
  } catch {
    console.info(JSON.stringify({ type: 'matimato.telemetry.degraded', accepted: accepted.length, rejected }));
    return { accepted: accepted.length, rejected, degraded: true };
  }
}

function redactText(value: string): string {
  return value
    .replace(/[A-Z0-9]{5,8}/g, '[redacted-code]')
    .replace(/mongodb(\+srv)?:\/\/[^\s]+/gi, '[redacted-mongodb-uri]')
    .slice(0, 120);
}

import type { TelemetryEvent, TelemetryEventName, TelemetryPropertyValue } from '@/lib/shared/types';

const TELEMETRY_ENABLED = process.env.NEXT_PUBLIC_MATIMATO_TELEMETRY !== 'false';
const BUFFER_LIMIT = 10;
const FLUSH_MS = 5000;

const buffer: TelemetryEvent[] = [];
let timer: number | undefined;
let sessionHashPromise: Promise<string> | undefined;

export function emitTelemetry(input: {
  name: TelemetryEventName;
  playerId?: string;
  matchId?: string;
  phase?: string;
  durationMs?: number;
  result?: 'ok' | 'error' | 'cancelled';
  properties?: Record<string, TelemetryPropertyValue>;
}): void {
  if (!TELEMETRY_ENABLED || typeof window === 'undefined') return;
  void createTelemetryEvent(input).then((event) => {
    buffer.push(event);
    if (buffer.length >= BUFFER_LIMIT) flushTelemetry();
    else scheduleFlush();
  });
}

export function flushTelemetry(useBeacon = false): void {
  if (!buffer.length || typeof window === 'undefined') return;
  const events = buffer.splice(0, BUFFER_LIMIT);
  const body = JSON.stringify({ events });
  if (useBeacon && navigator.sendBeacon) {
    navigator.sendBeacon('/api/events', new Blob([body], { type: 'application/json' }));
    return;
  }
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 3000);
  fetch('/api/events', { method: 'POST', headers: { 'content-type': 'application/json' }, body, signal: controller.signal })
    .catch(() => undefined)
    .finally(() => window.clearTimeout(timeout));
}

export function installTelemetryPagehide(): () => void {
  if (!TELEMETRY_ENABLED || typeof window === 'undefined') return () => undefined;
  const handler = () => flushTelemetry(true);
  window.addEventListener('pagehide', handler);
  return () => window.removeEventListener('pagehide', handler);
}

async function createTelemetryEvent(input: Parameters<typeof emitTelemetry>[0]): Promise<TelemetryEvent> {
  return {
    name: input.name,
    version: 1,
    occurredAt: new Date().toISOString(),
    sessionHash: await getSessionHash(),
    playerHash: input.playerId ? await hashText(input.playerId) : undefined,
    matchHash: input.matchId ? await hashText(input.matchId) : undefined,
    phase: input.phase,
    durationMs: input.durationMs,
    result: input.result,
    properties: sanitizeProperties(input.properties ?? {})
  };
}

function scheduleFlush() {
  if (timer || typeof window === 'undefined') return;
  timer = window.setTimeout(() => {
    timer = undefined;
    flushTelemetry();
  }, FLUSH_MS);
}

function getSessionHash(): Promise<string> {
  if (!sessionHashPromise) {
    let sessionId = sessionStorage.getItem('matimato.telemetrySession');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('matimato.telemetrySession', sessionId);
    }
    sessionHashPromise = hashText(sessionId);
  }
  return sessionHashPromise;
}

async function hashText(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

function sanitizeProperties(properties: Record<string, TelemetryPropertyValue>): Record<string, TelemetryPropertyValue> {
  const safe: Record<string, TelemetryPropertyValue> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (typeof value === 'string') safe[key] = value.replace(/[A-Z0-9]{5,8}/g, '[redacted-code]').slice(0, 120);
    else safe[key] = value;
  }
  return safe;
}

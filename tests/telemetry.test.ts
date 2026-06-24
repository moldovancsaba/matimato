import { describe, expect, it } from 'vitest';
import { ingestTelemetryPayload, sanitizeTelemetryEvent } from '@/lib/server/telemetry';

describe('telemetry validation and redaction', () => {
  it('accepts allowlisted events and redacts invite-like values', () => {
    const event = sanitizeTelemetryEvent({
      name: 'lobby_created',
      version: 1,
      occurredAt: '2026-06-24T10:00:00.000Z',
      sessionHash: 'a'.repeat(16),
      playerHash: 'b'.repeat(16),
      matchHash: 'c'.repeat(16),
      result: 'ok',
      properties: {
        status: 'waiting',
        inviteCode: 'ABC123',
        errorCode: 'ROOM9'
      }
    });
    expect(event?.properties.status).toBe('waiting');
    expect(event?.properties.inviteCode).toBeUndefined();
    expect(event?.properties.errorCode).toBe('[redacted-code]');
  });

  it('rejects unknown event names and malformed hashes', () => {
    expect(sanitizeTelemetryEvent({
      name: 'unknown',
      version: 1,
      occurredAt: '2026-06-24T10:00:00.000Z',
      sessionHash: 'a'.repeat(16),
      properties: {}
    })).toBeNull();
    expect(sanitizeTelemetryEvent({
      name: 'daily_started',
      version: 1,
      occurredAt: '2026-06-24T10:00:00.000Z',
      sessionHash: 'raw-player-id',
      properties: {}
    })).toBeNull();
  });

  it('fails open when server ingestion is disabled', async () => {
    const previous = process.env.MATIMATO_EVENTS_ENABLED;
    process.env.MATIMATO_EVENTS_ENABLED = 'false';
    const result = await ingestTelemetryPayload(JSON.stringify({ events: [{
      name: 'daily_started',
      version: 1,
      occurredAt: '2026-06-24T10:00:00.000Z',
      sessionHash: 'a'.repeat(16),
      properties: { date: '2026-06-24' }
    }] }));
    process.env.MATIMATO_EVENTS_ENABLED = previous;
    expect(result).toEqual({ accepted: 1, rejected: 0, degraded: true });
  });
});

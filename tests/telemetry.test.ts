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

  it('accepts progression journey events with bounded safe properties', () => {
    const event = sanitizeTelemetryEvent({
      name: 'board_unlock_purchased',
      version: 1,
      occurredAt: '2026-06-25T10:00:00.000Z',
      sessionHash: 'a'.repeat(16),
      playerHash: 'b'.repeat(16),
      result: 'ok',
      properties: {
        boardSize: 6,
        costXp: 120,
        spendableBucket: '120-259',
        playerId: 'raw-player-id'
      }
    });
    expect(event?.properties).toEqual({ boardSize: 6, costXp: 120, spendableBucket: '120-259' });
  });

  it('accepts season and bot telemetry safe properties', () => {
    const event = sanitizeTelemetryEvent({
      name: 'season_reward_claimed',
      version: 1,
      occurredAt: '2026-06-26T10:00:00.000Z',
      sessionHash: 'a'.repeat(16),
      playerHash: 'b'.repeat(16),
      result: 'ok',
      properties: {
        seasonId: 'founders-chase-2026',
        rewardId: 'starter-cache',
        xp: 40,
        newlyClaimed: true,
        rawPlayerId: 'not-allowed'
      }
    });
    expect(event?.properties).toEqual({ seasonId: 'founders-chase-2026', rewardId: 'starter-cache', xp: 40, newlyClaimed: true });
    expect(sanitizeTelemetryEvent({
      name: 'bot_profile_selected',
      version: 1,
      occurredAt: '2026-06-26T10:00:00.000Z',
      sessionHash: 'a'.repeat(16),
      properties: { profileId: 'rookie-guide', difficulty: 'rookie', boardSize: 5 }
    })?.properties).toEqual({ profileId: 'rookie-guide', difficulty: 'rookie', boardSize: 5 });
  });
});

import { describe, expect, it } from 'vitest';
import { cancelLobby, createLobby, joinLobby, markLobbyReady, refreshLobby } from '@/lib/game/lobby';
import { newGame } from '@/lib/game/rules';

describe('battle lobby state machine', () => {
  it('keeps a battle waiting until both seats are ready', () => {
    const createdAt = new Date('2026-06-24T10:00:00.000Z');
    const base = newGame('battle-lobby-1', 'battle', 'p1', 'Creator');
    const created = { ...base, lobby: createLobby(base, createdAt) };

    const joined = joinLobby(created, 'p2', 'Rival', new Date('2026-06-24T10:01:00.000Z'));
    expect(joined.status).toBe('waiting');
    expect(joined.players.south?.id).toBe('p2');

    const northReady = markLobbyReady(joined, 'p1', new Date('2026-06-24T10:02:00.000Z'));
    expect(northReady.status).toBe('waiting');
    expect(northReady.lobby?.status).toBe('ready');

    const bothReady = markLobbyReady(northReady, 'p2', new Date('2026-06-24T10:03:00.000Z'));
    expect(bothReady.status).toBe('active');
    expect(bothReady.lobby?.status).toBe('active');
  });

  it('expires and cancels terminal lobby states without activating the match', () => {
    const createdAt = new Date('2026-06-24T10:00:00.000Z');
    const base = newGame('battle-lobby-2', 'battle', 'p1', 'Creator');
    const created = { ...base, lobby: createLobby(base, createdAt) };

    const expired = refreshLobby(created, 'p1', new Date('2026-06-24T10:31:00.000Z'));
    expect(expired.status).toBe('waiting');
    expect(expired.lobby?.status).toBe('expired');

    const cancelled = cancelLobby(created, 'p1', new Date('2026-06-24T10:04:00.000Z'));
    expect(cancelled.status).toBe('waiting');
    expect(cancelled.lobby?.status).toBe('cancelled');
    expect(cancelled.lobby?.cancelledAt).toBe('2026-06-24T10:04:00.000Z');
  });
});

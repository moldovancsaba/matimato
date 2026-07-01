import { describe, expect, it } from 'vitest';
import { buildReplaySnapshot } from '@/lib/game/replay';
import { newGame, applyMove } from '@/lib/game/rules';

describe('replay sanitization', () => {
  it('builds a public replay without raw player ids, invite codes, or action ids', () => {
    const base = newGame('replay-1', 'battle', 'north-raw-id', 'North Tag');
    const joined = {
      ...base,
      players: {
        ...base.players,
        south: { id: 'south-raw-id', tag: 'South Tag', side: 'south' as const, score: 0 }
      },
      status: 'active' as const
    };
    const moved = applyMove(joined, 'north', 0, 0, 'secret-action-id').snapshot;
    const complete = {
      ...moved,
      status: 'complete' as const,
      outcome: { winner: 'north' as const, reason: 'board-complete' as const },
      updatedAt: '2026-07-01T10:00:00.000Z'
    };

    const replay = buildReplaySnapshot(complete);
    const serialized = JSON.stringify(replay);
    expect(replay.players).toEqual(expect.arrayContaining([{ side: 'north', tag: 'North Tag', score: expect.any(Number) }]));
    expect(replay.frames[0]).not.toHaveProperty('actionId');
    expect(serialized).not.toContain('north-raw-id');
    expect(serialized).not.toContain('south-raw-id');
    expect(serialized).not.toContain(complete.inviteCode);
    expect(serialized).not.toContain('secret-action-id');
  });

  it('returns summary-only replay for completed legacy matches without moveLog', () => {
    const base = newGame('replay-legacy', 'solo', 'p1', 'Player');
    const replay = buildReplaySnapshot({
      ...base,
      moveLog: undefined,
      status: 'complete',
      outcome: { winner: 'north', reason: 'no-legal-cells' },
      updatedAt: '2026-07-01T10:00:00.000Z'
    });
    expect(replay.summaryOnly).toBe(true);
    expect(replay.frames).toEqual([]);
  });

  it('rejects private and incomplete matches', () => {
    const base = newGame('replay-private', 'solo', 'p1', 'Player');
    expect(() => buildReplaySnapshot(base)).toThrow('REPLAY_NOT_COMPLETE');
    expect(() => buildReplaySnapshot({
      ...base,
      status: 'complete',
      outcome: { winner: 'draw', reason: 'board-complete' },
      replayVisibility: 'private'
    })).toThrow('REPLAY_PRIVATE');
  });
});

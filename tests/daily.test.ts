import { describe, expect, it } from 'vitest';
import { createDailyChallenge, formatUtcDate, getWeekEndExclusive, getWeekStart, isValidTodayDailyId, rankWeeklyResults, updateStreak } from '@/lib/game/daily';
import { createBoard } from '@/lib/game/rules';
import type { DailyResult } from '@/lib/shared/types';

describe('daily challenge contracts', () => {
  it('uses UTC dates and deterministic board seeds', () => {
    const now = new Date('2026-06-24T23:59:59.000Z');
    const daily = createDailyChallenge(now);
    expect(daily.id).toBe('2026-06-24');
    expect(daily.seed).toBe('daily:2026-06-24');
    expect(formatUtcDate(new Date('2026-06-25T00:00:00.000Z'))).toBe('2026-06-25');
    expect(isValidTodayDailyId('2026-06-24', now)).toBe(true);
    expect(isValidTodayDailyId('2026-06-23', now)).toBe(false);
    expect(createBoard(daily.seed)).toEqual(createBoard(daily.seed));
    expect(createBoard(daily.seed)).not.toEqual(createBoard('daily:2026-06-25'));
  });

  it('updates streaks once per UTC day', () => {
    const first = updateStreak(undefined, '2026-06-24');
    expect(first).toMatchObject({ current: 1, best: 1, lastCompletedDate: '2026-06-24' });
    expect(updateStreak(first, '2026-06-24')).toEqual(first);
    const continued = updateStreak(first, '2026-06-25');
    expect(continued).toMatchObject({ current: 2, best: 2, lastCompletedDate: '2026-06-25' });
    const reset = updateStreak(continued, '2026-06-27');
    expect(reset).toMatchObject({ current: 1, best: 2, lastCompletedDate: '2026-06-27' });
  });

  it('ranks weekly results by score, completion time, attempts, and stable hash', () => {
    const rows: DailyResult[] = [
      result('b', 40, 2, '2026-06-24T10:05:00.000Z'),
      result('a', 40, 1, '2026-06-24T10:05:00.000Z'),
      result('c', 55, 3, '2026-06-24T11:00:00.000Z'),
      result('d', 40, 1, '2026-06-24T10:04:00.000Z')
    ];
    const ranked = rankWeeklyResults(rows);
    expect(ranked.map((entry) => entry.tag)).toEqual(['c', 'd', 'a', 'b']);
    expect(ranked.map((entry) => entry.rank)).toEqual([1, 2, 3, 4]);
    expect(getWeekStart('2026-06-24')).toBe('2026-06-22');
    expect(getWeekEndExclusive('2026-06-24')).toBe('2026-06-29');
  });
});

function result(playerId: string, score: number, attempts: number, completedAt: string): DailyResult {
  return {
    id: `2026-06-24:${playerId}`,
    challengeId: '2026-06-24',
    playerId,
    tag: playerId,
    score,
    attempts,
    completedAt,
    outcome: { winner: 'north', reason: 'board-complete' }
  };
}

import { createHash } from 'node:crypto';
import type { DailyChallenge, DailyResult, StreakState, WeeklyRankEntry } from '@/lib/shared/types';

const DAY_MS = 24 * 60 * 60 * 1000;

export function formatUtcDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function createDailyChallenge(now = new Date(), result?: DailyResult): DailyChallenge {
  const date = formatUtcDate(now);
  const startsAt = `${date}T00:00:00.000Z`;
  const endsAt = new Date(Date.parse(startsAt) + DAY_MS).toISOString();
  return {
    id: date,
    date,
    seed: `daily:${date}`,
    startsAt,
    endsAt,
    boardSize: 9,
    status: result?.completedAt ? 'completed' : 'available',
    resetAt: endsAt
  };
}

export function isValidTodayDailyId(dailyId: string | undefined, now = new Date()): boolean {
  return !dailyId || dailyId === formatUtcDate(now);
}

export function createEmptyStreak(): StreakState {
  return { current: 0, best: 0, protectedMisses: 0 };
}

export function updateStreak(current: StreakState | undefined, completedDate: string): StreakState {
  const previous = current ?? createEmptyStreak();
  if (previous.lastCompletedDate === completedDate) return previous;
  const yesterday = new Date(`${completedDate}T00:00:00.000Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const continued = previous.lastCompletedDate === formatUtcDate(yesterday);
  const nextCurrent = continued ? previous.current + 1 : 1;
  return {
    current: nextCurrent,
    best: Math.max(previous.best, nextCurrent),
    lastCompletedDate: completedDate,
    protectedMisses: 0
  };
}

export function getWeekStart(dateText: string): string {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return formatUtcDate(date);
}

export function getWeekEndExclusive(dateText: string): string {
  const start = new Date(`${getWeekStart(dateText)}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() + 7);
  return formatUtcDate(start);
}

export function rankWeeklyResults(results: DailyResult[]): WeeklyRankEntry[] {
  const sorted = [...results].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const time = Date.parse(a.completedAt) - Date.parse(b.completedAt);
    if (time !== 0) return time;
    if (a.attempts !== b.attempts) return a.attempts - b.attempts;
    return hashIdentifier(a.playerId).localeCompare(hashIdentifier(b.playerId));
  });
  let previous: DailyResult | undefined;
  let previousRank = 0;
  return sorted.map((result, index) => {
    const tied = previous && previous.score === result.score && previous.completedAt === result.completedAt && previous.attempts === result.attempts;
    const rank = tied ? previousRank : index + 1;
    previous = result;
    previousRank = rank;
    return {
      rank,
      playerHash: hashIdentifier(result.playerId),
      tag: result.tag,
      score: result.score,
      attempts: result.attempts,
      completedAt: result.completedAt
    };
  });
}

export function hashIdentifier(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

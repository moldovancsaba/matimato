import type { MatchSummary } from "@/lib/game/match-summary";

export type LeaderboardPeriod = "weekly" | "all_time";
export type LeaderboardMode = "solo" | "battle";

export type LeaderboardEntry = {
  rank: number;
  profileId: string;
  displayTag: string;
  rankValue: number;
  tieBreaker: number;
  matches: number;
  updatedAt: string;
  current: boolean;
};

type DraftEntry = Omit<LeaderboardEntry, "rank" | "current"> & {
  wins: number;
  losses: number;
  draws: number;
};

export function buildLeaderboard(input: {
  summaries: MatchSummary[];
  mode: LeaderboardMode;
  currentProfileId?: string;
  limit?: number;
}): { entries: LeaderboardEntry[]; currentEntry: LeaderboardEntry | null } {
  const drafts = new Map<string, DraftEntry>();
  for (const summary of input.summaries) {
    if (summary.mode !== leaderboardModeToSummaryMode(input.mode) || summary.movesCount < 1) continue;
    for (const participant of summary.participants) {
      if (!participant.profileId) continue;
      const current = drafts.get(participant.profileId) ?? {
        profileId: participant.profileId,
        displayTag: participant.displayName,
        rankValue: 0,
        tieBreaker: 0,
        matches: 0,
        updatedAt: summary.completedAt,
        wins: 0,
        losses: 0,
        draws: 0
      };
      current.displayTag = participant.displayName || current.displayTag;
      current.matches += 1;
      current.updatedAt = current.updatedAt > summary.completedAt ? current.updatedAt : summary.completedAt;
      if (input.mode === "solo") {
        current.rankValue = Math.max(current.rankValue, participant.score);
        current.tieBreaker = current.rankValue === participant.score ? -summary.durationMs : current.tieBreaker;
      } else {
        const won = summary.winnerPlayerId === participant.playerId;
        current.wins += won ? 1 : 0;
        current.draws += summary.draw ? 1 : 0;
        current.losses += !won && !summary.draw ? 1 : 0;
        current.rankValue = current.wins * 100 + current.draws * 25 - current.losses * 20;
        current.tieBreaker = current.wins * 10 + current.draws;
      }
      drafts.set(participant.profileId, current);
    }
  }

  const ranked = [...drafts.values()]
    .sort((a, b) => b.rankValue - a.rankValue || b.tieBreaker - a.tieBreaker || a.updatedAt.localeCompare(b.updatedAt) || a.profileId.localeCompare(b.profileId))
    .map((entry, index) => ({
      rank: index + 1,
      profileId: entry.profileId,
      displayTag: entry.displayTag,
      rankValue: entry.rankValue,
      tieBreaker: entry.tieBreaker,
      matches: entry.matches,
      updatedAt: entry.updatedAt,
      current: entry.profileId === input.currentProfileId
    }));

  const limit = input.limit ?? 20;
  return {
    entries: ranked.slice(0, limit),
    currentEntry: ranked.find((entry) => entry.profileId === input.currentProfileId) ?? null
  };
}

export function leaderboardModeToSummaryMode(mode: LeaderboardMode): "ai" | "pvp" {
  return mode === "solo" ? "ai" : "pvp";
}

export function weeklyStart(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = start.getUTCDay() || 7;
  start.setUTCDate(start.getUTCDate() - day + 1);
  return start.toISOString();
}

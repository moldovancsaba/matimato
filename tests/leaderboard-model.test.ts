import { describe, expect, it } from "vitest";
import { buildLeaderboard, weeklyStart } from "@/lib/leaderboard/leaderboard-model";
import type { MatchSummary } from "@/lib/game/match-summary";

function summary(id: string, winnerPlayerId: string, p1Score: number, p2Score: number): MatchSummary {
  return {
    gameId: id,
    mode: "pvp",
    boardSize: 9,
    participants: [
      { playerId: "p1", profileId: "profile-1", displayName: "North", side: "north", kind: "human", score: p1Score },
      { playerId: "p2", profileId: "profile-2", displayName: "South", side: "south", kind: "human", score: p2Score }
    ],
    winnerPlayerId,
    draw: false,
    resultReason: "no-legal-moves",
    movesCount: 4,
    durationMs: 90_000,
    boardHash: "c".repeat(64),
    completedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:01.000Z"
  };
}

describe("leaderboard model", () => {
  it("ranks battle entries with deterministic formula", () => {
    const board = buildLeaderboard({
      summaries: [summary("a", "p1", 12, 8), summary("b", "p2", 7, 9)],
      mode: "battle",
      currentProfileId: "profile-1"
    });
    expect(board.entries.map((entry) => [entry.profileId, entry.rankValue])).toEqual([
      ["profile-1", 80],
      ["profile-2", 80]
    ]);
    expect(board.entries[0].current).toBe(true);
  });

  it("uses best solo score and faster duration as tie breaker", () => {
    const solo: MatchSummary = {
      ...summary("solo", "p1", 31, 4),
      mode: "ai",
      participants: [{ playerId: "p1", profileId: "profile-1", displayName: "Solo", side: "north", kind: "human", score: 31 }],
      durationMs: 50_000
    };
    expect(buildLeaderboard({ summaries: [solo], mode: "solo" }).entries[0]).toMatchObject({
      profileId: "profile-1",
      rankValue: 31,
      tieBreaker: -50_000
    });
  });

  it("computes weekly start in UTC", () => {
    expect(weeklyStart(new Date("2026-06-21T12:00:00.000Z"))).toBe("2026-06-15T00:00:00.000Z");
  });
});

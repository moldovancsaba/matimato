import { describe, expect, it } from "vitest";
import { challengeBoard, dailyChallenge, rankChallengeAttempts } from "@/lib/challenges/challenge-model";
import type { MatchSummary } from "@/lib/game/match-summary";

describe("daily challenge model", () => {
  it("generates deterministic 9x9 challenge boards", () => {
    expect(challengeBoard("2026-06-21")).toEqual(challengeBoard("2026-06-21"));
    expect(challengeBoard("2026-06-21")).not.toEqual(challengeBoard("2026-06-22"));
    expect(dailyChallenge("2026-06-21")).toMatchObject({ date: "2026-06-21", status: "active" });
  });

  it("ranks challenge attempts by score duration and completion time", () => {
    const summaries: MatchSummary[] = [
      attempt("a", "profile-a", "A", 20, 80_000),
      attempt("b", "profile-b", "B", 20, 70_000),
      attempt("c", "profile-c", "C", 30, 120_000)
    ];
    expect(rankChallengeAttempts(summaries, "2026-06-21").map((item) => item.displayTag)).toEqual(["C", "B", "A"]);
  });
});

function attempt(gameId: string, profileId: string, displayTag: string, score: number, durationMs: number): MatchSummary {
  return {
    gameId,
    challengeDate: "2026-06-21",
    mode: "ai",
    boardSize: 9,
    participants: [{ playerId: profileId, profileId, displayName: displayTag, side: "north", kind: "human", score }],
    winnerPlayerId: profileId,
    draw: false,
    resultReason: "no-legal-moves",
    movesCount: 4,
    durationMs,
    boardHash: "e".repeat(64),
    completedAt: `2026-06-21T00:00:0${gameId.charCodeAt(0) % 3}.000Z`,
    createdAt: "2026-06-21T00:00:00.000Z"
  };
}

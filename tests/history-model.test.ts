import { describe, expect, it } from "vitest";
import { modeFilterToSummaryMode, toHistoryItemForProfile } from "@/lib/history/history-model";
import type { MatchSummary } from "@/lib/game/match-summary";

const summary: MatchSummary = {
  gameId: "history-1",
  mode: "pvp",
  boardSize: 9,
  participants: [
    { playerId: "p1", profileId: "profile-1", displayName: "North", side: "north", kind: "human", score: 12 },
    { playerId: "p2", profileId: "profile-2", displayName: "South", side: "south", kind: "human", score: 8 }
  ],
  winnerPlayerId: "p1",
  draw: false,
  resultReason: "no-legal-moves",
  movesCount: 10,
  durationMs: 90_000,
  boardHash: "b".repeat(64),
  completedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:01.000Z"
};

describe("history model", () => {
  it("projects public history for a profile", () => {
    expect(toHistoryItemForProfile(summary, "profile-1")).toEqual({
      gameId: "history-1",
      mode: "BATTLE",
      result: "win",
      playerScore: 12,
      rivalScore: 8,
      rivalName: "South",
      completedAt: "2026-01-01T00:00:00.000Z",
      durationMs: 90_000
    });
  });

  it("maps history filters to summary modes", () => {
    expect(modeFilterToSummaryMode("all")).toBeUndefined();
    expect(modeFilterToSummaryMode("solo")).toBe("ai");
    expect(modeFilterToSummaryMode("battle")).toBe("pvp");
  });
});

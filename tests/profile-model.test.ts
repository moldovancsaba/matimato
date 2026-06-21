import { describe, expect, it } from "vitest";
import { applySummaryToProfile, createProfile, normalizeDisplayTag, updateProfileIdentity } from "@/lib/profile/profile-model";
import type { MatchSummary } from "@/lib/game/match-summary";

function summary(overrides: Partial<MatchSummary> = {}): MatchSummary {
  return {
    gameId: "profile-match",
    mode: "pvp",
    boardSize: 9,
    participants: [
      { playerId: "p1", profileId: "profile-1", displayName: "North", side: "north", kind: "human", score: 18 },
      { playerId: "p2", profileId: "profile-2", displayName: "South", side: "south", kind: "human", score: 10 }
    ],
    winnerPlayerId: "p1",
    draw: false,
    resultReason: "no-legal-moves",
    movesCount: 9,
    durationMs: 120_000,
    boardHash: "a".repeat(64),
    completedAt: "2026-01-01T00:02:00.000Z",
    createdAt: "2026-01-01T00:02:01.000Z",
    ...overrides
  };
}

describe("profile model", () => {
  it("normalizes display tags", () => {
    expect(normalizeDisplayTag("  Csaba   Zoltán!  ")).toBe("Csaba Zoltán");
    expect(normalizeDisplayTag("")).toBe("Player");
  });

  it("creates and updates public identity fields", () => {
    const profile = createProfile({
      id: "profile-1",
      tokenHash: "hash",
      displayTag: "Tester",
      now: new Date("2026-01-01T00:00:00.000Z")
    });
    expect(profile).toMatchObject({ displayTag: "Tester", level: 1, xp: 0 });
    expect(updateProfileIdentity(profile, { displayTag: "Arena King", now: new Date("2026-01-01T00:01:00.000Z") })).toMatchObject({
      displayTag: "Arena King",
      lastActiveAt: "2026-01-01T00:01:00.000Z"
    });
  });

  it("applies match summary stats once per profile", () => {
    const profile = createProfile({ id: "profile-1", tokenHash: "hash", displayTag: "Tester" });
    const updated = applySummaryToProfile(profile, summary());
    const duplicate = applySummaryToProfile(updated, summary());
    expect(duplicate).toMatchObject({
      stats: { matches: 1, wins: 1, losses: 0, draws: 0, bestScore: 18, currentStreak: 1 },
      xp: 116,
      level: 2,
      appliedSummaryIds: ["profile-match"]
    });
  });
});

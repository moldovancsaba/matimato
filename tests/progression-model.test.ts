import { describe, expect, it } from "vitest";
import type { MatchSummary } from "@/lib/game/match-summary";
import { applyProgression, levelForXp, xpForSummary } from "@/lib/progression/progression-model";
import { createProfile } from "@/lib/profile/profile-model";

const summary: MatchSummary = {
  gameId: "progression-1",
  mode: "pvp",
  boardSize: 9,
  participants: [
    { playerId: "p1", profileId: "profile-1", displayName: "North", side: "north", kind: "human", score: 30 },
    { playerId: "p2", profileId: "profile-2", displayName: "South", side: "south", kind: "human", score: 10 }
  ],
  winnerPlayerId: "p1",
  draw: false,
  resultReason: "no-legal-moves",
  movesCount: 8,
  durationMs: 100_000,
  boardHash: "d".repeat(64),
  completedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:01.000Z"
};

describe("progression model", () => {
  it("computes deterministic XP and levels", () => {
    expect(xpForSummary(summary, summary.participants[0], 25)).toBe(140);
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(400)).toBe(3);
  });

  it("updates missions and badges deterministically", () => {
    const profile = createProfile({ id: "profile-1", tokenHash: "hash", displayTag: "Tester" });
    const progressed = applyProgression({ ...profile, stats: { ...profile.stats, currentStreak: 3 } }, summary, summary.participants[0]);
    expect(progressed.missions.map((mission) => mission.missionId)).toContain("daily-finish");
    expect(progressed.badges.map((badge) => badge.badgeId)).toEqual(["first-match", "first-win", "hot-streak"]);
  });
});

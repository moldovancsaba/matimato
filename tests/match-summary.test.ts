import { describe, expect, it } from "vitest";
import { toMatchSummary } from "@/lib/game/match-summary";
import type { GameState } from "@/lib/game/types";
import { createGameForMode, forfeitGame } from "@/lib/server/game-service";
import { getGameStore } from "@/lib/server/store";

function terminalGame(): GameState {
  return {
    id: "summary-game",
    code: "SUM1",
    status: "finished",
    mode: "pvp",
    boardSize: 9,
    board: Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => 1)),
    players: [
      { playerId: "north", displayName: "North", side: "north", kind: "human", joinedAt: "2026-01-01T00:00:00.000Z" },
      { playerId: "south", displayName: "South", side: "south", kind: "human", joinedAt: "2026-01-01T00:00:00.000Z" }
    ],
    turnPlayerId: "north",
    constraint: null,
    scores: { north: 7, south: 3 },
    moves: [
      { sequence: 1, playerId: "north", row: 0, col: 0, value: 7, createdAt: "2026-01-01T00:00:02.000Z" }
    ],
    difficulty: "standard",
    winnerPlayerId: "north",
    terminal: { reason: "no-legal-moves", winnerPlayerId: "north", draw: false },
    version: 2,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:01:00.000Z",
    expiresAt: "2026-01-02T00:00:00.000Z"
  };
}

describe("match summaries", () => {
  it("builds an immutable terminal summary contract", () => {
    const summary = toMatchSummary(terminalGame(), new Date("2026-01-01T00:02:00.000Z"));
    expect(summary).toMatchObject({
      gameId: "summary-game",
      mode: "pvp",
      boardSize: 9,
      winnerPlayerId: "north",
      draw: false,
      resultReason: "no-legal-moves",
      movesCount: 1,
      durationMs: 60_000,
      createdAt: "2026-01-01T00:02:00.000Z"
    });
    expect(summary?.participants).toEqual([
      { playerId: "north", displayName: "North", side: "north", kind: "human", score: 7 },
      { playerId: "south", displayName: "South", side: "south", kind: "human", score: 3 }
    ]);
    expect(summary?.boardHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("ignores non-terminal games", () => {
    expect(toMatchSummary({ ...terminalGame(), status: "active", terminal: undefined })).toBeNull();
  });

  it("keeps memory upserts idempotent by game id", async () => {
    const store = getGameStore();
    const first = toMatchSummary(terminalGame(), new Date("2026-01-01T00:02:00.000Z"));
    const duplicate = toMatchSummary(terminalGame(), new Date("2026-01-01T00:03:00.000Z"));
    expect(first).not.toBeNull();
    expect(duplicate).not.toBeNull();
    await store.upsertMatchSummary(first!);
    await store.upsertMatchSummary(duplicate!);
    expect(await store.getMatchSummary("summary-game")).toMatchObject({ createdAt: "2026-01-01T00:02:00.000Z" });
  });

  it("writes a summary when a terminal service action succeeds", async () => {
    const { game, credential } = await createGameForMode({
      mode: "ai",
      boardSize: 9,
      difficulty: "standard",
      displayName: "Tester"
    });
    await forfeitGame(game.id, credential);
    const summary = await getGameStore().getMatchSummary(game.id);
    expect(summary).toMatchObject({
      gameId: game.id,
      mode: "ai",
      boardSize: 9,
      resultReason: "forfeit"
    });
  });
});

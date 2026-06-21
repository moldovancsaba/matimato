import { describe, expect, it } from "vitest";
import { applyMove, generateSignedBoard, getLegalCells } from "@/lib/game/engine";
import { toCanonical, toView } from "@/lib/game/perspective";
import type { GameState } from "@/lib/game/types";

function fixture(): GameState {
  return {
    id: "g1",
    code: "ABCD",
    status: "active",
    mode: "pvp",
    boardSize: 3,
    board: [
      [5, -2, 1],
      [4, -7, 3],
      [-1, 8, -9]
    ],
    players: [
      { playerId: "p1", displayName: "P1", side: "north", kind: "human", joinedAt: "now" },
      { playerId: "p2", displayName: "P2", side: "south", kind: "human", joinedAt: "now" }
    ],
    turnPlayerId: "p1",
    constraint: null,
    scores: { p1: 0, p2: 0 },
    moves: [],
    difficulty: "standard",
    version: 0,
    createdAt: "now",
    updatedAt: "now",
    expiresAt: "later"
  };
}

describe("game engine", () => {
  it("generates positive and negative non-zero board values", () => {
    let index = 0;
    const values = [0.1, 0.2, 0.9, 0.9];
    const board = generateSignedBoard(2, 9, 0.5, () => values[index++ % values.length]);
    expect(board.flat()).toContain(1);
    expect(board.flat()).toContain(-9);
    expect(board.flat()).not.toContain(0);
  });

  it("applies signed score and constrains the next player to the selected column", () => {
    const state = applyMove(fixture(), { playerId: "p1", row: 0, col: 1 });
    expect(state.scores.p1).toBe(-2);
    expect(state.constraint).toEqual({ axis: "column", index: 1 });
    expect(getLegalCells(state, "p2")).toEqual([{ row: 1, col: 1 }, { row: 2, col: 1 }]);
  });

  it("round-trips south perspective coordinates", () => {
    const canonical = { row: 0, col: 2 };
    const view = toView("south", 3, canonical);
    expect(view).toEqual({ viewRow: 2, viewCol: 0 });
    expect(toCanonical("south", 3, view)).toEqual(canonical);
  });
});

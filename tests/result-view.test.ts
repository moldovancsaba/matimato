import { describe, expect, it } from "vitest";
import { toResultView } from "@/lib/game/result-view";
import type { PublicGameDto } from "@/lib/game/types";

function game(overrides: Partial<PublicGameDto> = {}): PublicGameDto {
  return {
    id: "g1",
    code: "BATTLE",
    status: "finished",
    mode: "pvp",
    boardSize: 9,
    boardView: [],
    players: [
      { playerId: "p1", displayName: "North", side: "north", kind: "human", score: 12 },
      { playerId: "p2", displayName: "South", side: "south", kind: "human", score: 8 }
    ],
    viewer: { playerId: "p1", side: "north", canMove: false },
    constraintView: null,
    legalCellsView: [],
    terminal: { reason: "no-legal-moves", winnerPlayerId: "p1", draw: false },
    winnerPlayerId: "p1",
    version: 3,
    updatedAt: "now",
    ...overrides
  };
}

describe("result view", () => {
  it("renders victory for the winning viewer", () => {
    expect(toResultView(game()).outcome).toBe("victory");
  });

  it("renders defeat for the losing viewer", () => {
    expect(toResultView(game({ viewer: { playerId: "p2", side: "south", canMove: false } })).outcome).toBe("defeat");
  });

  it("renders draw state", () => {
    const view = toResultView(game({
      terminal: { reason: "no-legal-moves", draw: true },
      winnerPlayerId: undefined
    }));
    expect(view).toMatchObject({ outcome: "draw", title: "Draw" });
  });

  it("renders closed states for abandoned and expired games", () => {
    expect(toResultView(game({ status: "abandoned" })).title).toBe("Lobby closed");
    expect(toResultView(game({ status: "expired" })).title).toBe("Battle expired");
  });
});

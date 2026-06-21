import crypto from "node:crypto";
import type { GameState, PlayerSide } from "./types";

export type MatchSummaryParticipant = {
  playerId: string;
  profileId?: string;
  displayName: string;
  side: PlayerSide;
  kind: "human" | "ai";
  score: number;
};

export type MatchSummary = {
  gameId: string;
  mode: "ai" | "pvp";
  boardSize: 9;
  participants: MatchSummaryParticipant[];
  winnerPlayerId?: string;
  draw: boolean;
  resultReason: "no-legal-moves" | "forfeit";
  movesCount: number;
  durationMs: number;
  boardHash: string;
  completedAt: string;
  createdAt: string;
};

export function toMatchSummary(game: GameState, now = new Date()): MatchSummary | null {
  if (game.status !== "finished" || !game.terminal || game.boardSize !== 9) return null;
  const completedAt = game.updatedAt;
  const createdAtMs = Date.parse(game.createdAt);
  const completedAtMs = Date.parse(completedAt);

  return {
    gameId: game.id,
    mode: game.mode,
    boardSize: 9,
    participants: game.players.map((player) => ({
      playerId: player.playerId,
      ...(player.profileId ? { profileId: player.profileId } : {}),
      displayName: player.displayName,
      side: player.side,
      kind: player.kind,
      score: game.scores[player.playerId] ?? 0
    })),
    winnerPlayerId: game.winnerPlayerId,
    draw: game.terminal.draw,
    resultReason: game.terminal.reason,
    movesCount: game.moves.length,
    durationMs: Number.isFinite(createdAtMs) && Number.isFinite(completedAtMs) ? Math.max(0, completedAtMs - createdAtMs) : 0,
    boardHash: hashBoard(game),
    completedAt,
    createdAt: now.toISOString()
  };
}

function hashBoard(game: GameState) {
  const payload = {
    boardSize: game.boardSize,
    mode: game.mode,
    moves: game.moves.map((move) => ({
      sequence: move.sequence,
      playerId: move.playerId,
      row: move.row,
      col: move.col,
      value: move.value
    })),
    terminal: game.terminal
  };
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

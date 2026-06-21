import type { Coordinate, GameState, LineConstraint, PlayerSide, PublicGameDto, ViewCoordinate } from "./types";
import { getLegalCells } from "./engine";

export function toCanonical(side: PlayerSide, size: number, coordinate: ViewCoordinate): Coordinate {
  if (side === "north") return { row: coordinate.viewRow, col: coordinate.viewCol };
  return { row: size - 1 - coordinate.viewRow, col: size - 1 - coordinate.viewCol };
}

export function toView(side: PlayerSide, size: number, coordinate: Coordinate): ViewCoordinate {
  if (side === "north") return { viewRow: coordinate.row, viewCol: coordinate.col };
  return { viewRow: size - 1 - coordinate.row, viewCol: size - 1 - coordinate.col };
}

export function lineToView(side: PlayerSide, size: number, constraint: LineConstraint): LineConstraint {
  if (!constraint || side === "north") return constraint;
  return { axis: constraint.axis, index: size - 1 - constraint.index };
}

export function boardToView(side: PlayerSide, board: (number | null)[][]) {
  if (side === "north") return board.map((row) => [...row]);
  return board.map((row) => [...row]).reverse().map((row) => row.reverse());
}

export function toPublicGameDto(state: GameState, viewerPlayerId?: string): PublicGameDto {
  const viewer = state.players.find((player) => player.playerId === viewerPlayerId);
  const side = viewer?.side ?? "north";
  const lastMove = state.moves[state.moves.length - 1];
  return {
    id: state.id,
    code: state.code,
    status: state.status,
    mode: state.mode,
    boardSize: state.boardSize,
    boardView: boardToView(side, state.board),
    players: state.players.map((player) => ({
      playerId: player.playerId,
      displayName: player.displayName,
      side: player.side,
      kind: player.kind,
      score: state.scores[player.playerId] ?? 0
    })),
    viewer: viewer
      ? {
          playerId: viewer.playerId,
          side: viewer.side,
          canMove: state.status === "active" && state.turnPlayerId === viewer.playerId
        }
      : undefined,
    turnPlayerId: state.turnPlayerId,
    turnDisplayName: state.players.find((player) => player.playerId === state.turnPlayerId)?.displayName,
    constraintView: lineToView(side, state.boardSize, state.constraint),
    legalCellsView: viewer ? getLegalCells(state, viewerPlayerId).map((cell) => toView(side, state.boardSize, cell)) : [],
    lastMoveView: lastMove ? { ...toView(side, state.boardSize, lastMove), playerId: lastMove.playerId, value: lastMove.value } : undefined,
    winnerPlayerId: state.winnerPlayerId,
    terminal: state.terminal,
    version: state.version,
    updatedAt: state.updatedAt
  };
}

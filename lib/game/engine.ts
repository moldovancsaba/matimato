import type { AiDifficulty, Coordinate, GameMode, GameState, LineConstraint, PlayerSlot } from "./types";

export class GameRuleError extends Error {
  constructor(public code: string, message: string, public status = 422) {
    super(message);
  }
}

export function generateSignedBoard(size: number, maxAbs = 9, positiveProbability = 0.6, rng = Math.random) {
  if (size === 9 && maxAbs === 9) return generateSignedSudokuBoard(positiveProbability, rng);
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => {
      const magnitude = Math.floor(rng() * maxAbs) + 1;
      return rng() < positiveProbability ? magnitude : -magnitude;
    })
  );
}

export function generateSignedSudokuBoard(positiveProbability = 0.6, rng = Math.random) {
  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
  const rows = shuffleBands(rng);
  const cols = shuffleBands(rng);
  return rows.map((row) =>
    cols.map((col) => {
      const magnitude = digits[(row * 3 + Math.floor(row / 3) + col) % 9];
      return rng() < positiveProbability ? magnitude : -magnitude;
    })
  );
}

function shuffleBands(rng: () => number) {
  return shuffle([0, 1, 2], rng).flatMap((band) => shuffle([0, 1, 2], rng).map((offset) => band * 3 + offset));
}

function shuffle<T>(values: T[], rng: () => number) {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

export function createInitialGameState(input: {
  id: string;
  code: string;
  mode: GameMode;
  boardSize: number;
  difficulty: AiDifficulty;
  host: PlayerSlot;
  secondPlayer?: PlayerSlot;
  now?: Date;
}): GameState {
  const now = input.now ?? new Date();
  const players = [input.host, ...(input.secondPlayer ? [input.secondPlayer] : [])];
  const scores = Object.fromEntries(players.map((player) => [player.playerId, 0]));
  const active = input.mode === "ai" || players.length === 2;
  return {
    id: input.id,
    code: input.code,
    status: active ? "active" : "waiting",
    mode: input.mode,
    boardSize: input.boardSize,
    board: generateSignedBoard(input.boardSize),
    players,
    turnPlayerId: input.host.playerId,
    constraint: null,
    scores,
    moves: [],
    difficulty: input.difficulty,
    version: 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString()
  };
}

export function getLegalCells(state: GameState, playerId = state.turnPlayerId): Coordinate[] {
  if (!playerId || state.status !== "active" || playerId !== state.turnPlayerId) return [];
  const cells: Coordinate[] = [];
  for (let row = 0; row < state.boardSize; row += 1) {
    for (let col = 0; col < state.boardSize; col += 1) {
      if (state.board[row][col] === null) continue;
      if (state.constraint?.axis === "row" && state.constraint.index !== row) continue;
      if (state.constraint?.axis === "column" && state.constraint.index !== col) continue;
      cells.push({ row, col });
    }
  }
  return cells;
}

export function applyMove(state: GameState, input: { playerId: string; row: number; col: number; now?: Date }): GameState {
  if (state.status !== "active") throw new GameRuleError("GAME_NOT_ACTIVE", "This game is not active.", 409);
  if (input.playerId !== state.turnPlayerId) throw new GameRuleError("NOT_YOUR_TURN", "It is not your turn.", 403);
  if (!Number.isInteger(input.row) || !Number.isInteger(input.col)) {
    throw new GameRuleError("INVALID_COORDINATE", "Move coordinates must be integers.");
  }
  if (input.row < 0 || input.col < 0 || input.row >= state.boardSize || input.col >= state.boardSize) {
    throw new GameRuleError("OUT_OF_BOUNDS", "That cell is outside the board.");
  }
  if (state.constraint?.axis === "row" && state.constraint.index !== input.row) {
    throw new GameRuleError("ILLEGAL_ROW", "Select a cell from the highlighted row.");
  }
  if (state.constraint?.axis === "column" && state.constraint.index !== input.col) {
    throw new GameRuleError("ILLEGAL_COLUMN", "Select a cell from the highlighted column.");
  }
  const value = state.board[input.row][input.col];
  if (value === null) throw new GameRuleError("CELL_CLAIMED", "That cell has already been claimed.");

  const now = input.now ?? new Date();
  const board = state.board.map((row) => [...row]);
  board[input.row][input.col] = null;
  const nextPlayer = getNextPlayer(state, input.playerId);
  const scores = { ...state.scores, [input.playerId]: (state.scores[input.playerId] ?? 0) + value };
  const constraint: LineConstraint = state.constraint?.axis === "column"
    ? { axis: "row", index: input.row }
    : { axis: "column", index: input.col };
  const moves = [
    ...state.moves,
    {
      sequence: state.moves.length + 1,
      playerId: input.playerId,
      row: input.row,
      col: input.col,
      value,
      createdAt: now.toISOString()
    }
  ];

  const next: GameState = {
    ...state,
    board,
    scores,
    moves,
    turnPlayerId: nextPlayer?.playerId,
    constraint,
    version: state.version + 1,
    updatedAt: now.toISOString()
  };

  if (!nextPlayer || getLegalCells(next, nextPlayer.playerId).length === 0) {
    return finishGame(next, "no-legal-moves");
  }
  return next;
}

export function chooseAiMove(state: GameState, difficulty: AiDifficulty): Coordinate | null {
  const legal = getLegalCells(state, state.turnPlayerId);
  if (legal.length === 0) return null;
  if (difficulty === "basic") return legal[Math.floor(Math.random() * legal.length)];
  const scored = legal.map((cell) => {
    const immediate = state.board[cell.row][cell.col] ?? 0;
    if (difficulty === "hard") {
      const replyLine = state.constraint?.axis === "column"
        ? { axis: "row" as const, index: cell.row }
        : { axis: "column" as const, index: cell.col };
      const replyValues = valuesInConstraint(state, replyLine).filter((value) => value !== immediate);
      const opponentBest = replyValues.length ? Math.max(...replyValues) : 0;
      return { cell, score: immediate - opponentBest * 0.35 };
    }
    return { cell, score: immediate };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].cell;
}

export function maybeApplyAiMove(state: GameState): GameState {
  const active = state.players.find((player) => player.playerId === state.turnPlayerId);
  if (!active || active.kind !== "ai" || state.status !== "active") return state;
  const move = chooseAiMove(state, state.difficulty);
  if (!move) return finishGame(state, "no-legal-moves");
  return applyMove(state, { playerId: active.playerId, row: move.row, col: move.col });
}

export function finishGame(state: GameState, reason: "no-legal-moves" | "forfeit", forfeitingPlayerId?: string): GameState {
  const sorted = [...state.players].sort((a, b) => (state.scores[b.playerId] ?? 0) - (state.scores[a.playerId] ?? 0));
  const draw = reason === "forfeit" ? false : sorted.length > 1 && (state.scores[sorted[0].playerId] ?? 0) === (state.scores[sorted[1].playerId] ?? 0);
  const winnerPlayerId = reason === "forfeit"
    ? state.players.find((player) => player.playerId !== forfeitingPlayerId)?.playerId
    : draw ? undefined : sorted[0]?.playerId;
  return {
    ...state,
    status: "finished",
    winnerPlayerId,
    terminal: { reason, winnerPlayerId, draw },
    updatedAt: new Date().toISOString(),
    version: state.version + 1
  };
}

function getNextPlayer(state: GameState, playerId: string) {
  const index = state.players.findIndex((player) => player.playerId === playerId);
  if (index === -1 || state.players.length < 2) return undefined;
  return state.players[(index + 1) % state.players.length];
}

function valuesInConstraint(state: GameState, constraint: NonNullable<LineConstraint>) {
  const values: number[] = [];
  for (let row = 0; row < state.boardSize; row += 1) {
    for (let col = 0; col < state.boardSize; col += 1) {
      if (constraint.axis === "row" && row !== constraint.index) continue;
      if (constraint.axis === "column" && col !== constraint.index) continue;
      const value = state.board[row][col];
      if (value !== null) values.push(value);
    }
  }
  return values;
}

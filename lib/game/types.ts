export type GameMode = "ai" | "pvp";
export type GameStatus = "waiting" | "active" | "finished" | "abandoned" | "expired";
export type PlayerSide = "north" | "south";
export type AiDifficulty = "basic" | "standard" | "hard";

export type Coordinate = {
  row: number;
  col: number;
};

export type ViewCoordinate = {
  viewRow: number;
  viewCol: number;
};

export type LineConstraint = {
  axis: "row" | "column";
  index: number;
} | null;

export type PlayerSlot = {
  playerId: string;
  displayName: string;
  side: PlayerSide;
  kind: "human" | "ai";
  tokenHash?: string;
  joinedAt: string;
};

export type AppliedMove = {
  sequence: number;
  playerId: string;
  row: number;
  col: number;
  value: number;
  createdAt: string;
};

export type TerminalState = {
  reason: "no-legal-moves" | "forfeit";
  winnerPlayerId?: string;
  draw: boolean;
};

export type GameState = {
  id: string;
  code: string;
  status: GameStatus;
  mode: GameMode;
  boardSize: number;
  board: (number | null)[][];
  players: PlayerSlot[];
  turnPlayerId?: string;
  constraint: LineConstraint;
  scores: Record<string, number>;
  moves: AppliedMove[];
  winnerPlayerId?: string;
  terminal?: TerminalState;
  difficulty: AiDifficulty;
  version: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
};

export type PublicPlayer = {
  playerId: string;
  displayName: string;
  side: PlayerSide;
  kind: "human" | "ai";
  score: number;
};

export type PublicGameDto = {
  id: string;
  code: string;
  status: GameStatus;
  mode: GameMode;
  boardSize: number;
  boardView: (number | null)[][];
  players: PublicPlayer[];
  viewer?: {
    playerId: string;
    side: PlayerSide;
    canMove: boolean;
  };
  turnPlayerId?: string;
  turnDisplayName?: string;
  constraintView: LineConstraint;
  legalCellsView: ViewCoordinate[];
  lastMoveView?: ViewCoordinate & { playerId: string; value: number };
  winnerPlayerId?: string;
  terminal?: TerminalState;
  version: number;
  updatedAt: string;
};

export type PlayerSide = 'north' | 'south';
export type GameMode = 'solo' | 'battle' | 'daily';
export type GameStatus = 'waiting' | 'active' | 'complete';
export type LegalTarget = { axis: 'any' } | { axis: 'row'; index: number } | { axis: 'column'; index: number };

export type BoardCell = {
  row: number;
  col: number;
  magnitude: number;
  sign: 1 | -1;
  value: number;
  removed: boolean;
};

export type PlayerState = {
  id: string;
  tag: string;
  side: PlayerSide;
  score: number;
};

export type MoveFrame = {
  actionId: string;
  version: number;
  side: PlayerSide;
  selected: { row: number; col: number; value: number };
  fromTarget: LegalTarget;
  toTarget: LegalTarget;
  scores: Record<PlayerSide, number>;
  outcome?: GameOutcome;
};

export type GameOutcome = {
  winner: PlayerSide | 'draw';
  reason: 'board-complete' | 'no-legal-cells' | 'resigned';
};

export type GameSnapshot = {
  id: string;
  inviteCode: string;
  code: string;
  mode: GameMode;
  status: GameStatus;
  version: number;
  board: BoardCell[];
  players: Record<PlayerSide, PlayerState | null>;
  currentTurn: PlayerSide;
  legalTarget: LegalTarget;
  outcome?: GameOutcome;
  createdAt: string;
  updatedAt: string;
};

export type CreateGameRequest = { type: 'create'; mode: GameMode; playerId: string; playerTag: string };
export type JoinGameRequest = { type: 'join'; inviteCode: string; playerId: string; playerTag: string };
export type MoveRequest = { type: 'move'; matchId: string; playerId: string; actionId: string; row: number; col: number; expectedVersion: number };
export type SyncRequest = { type: 'sync'; matchId: string; playerId?: string };
export type GameRequest = CreateGameRequest | JoinGameRequest | MoveRequest | SyncRequest;

export type CreateJoinResponse = { snapshot: GameSnapshot };
export type MoveResponse = { snapshot: GameSnapshot; frames: MoveFrame[] };
export type SyncResponse = { snapshot: GameSnapshot; frames: MoveFrame[] };
export type GameApiResponse = CreateJoinResponse | MoveResponse | SyncResponse;

export type ProfileSummary = {
  playerId: string;
  tag: string;
  level: number;
  xp: number;
  matches: number;
  wins: number;
  draws: number;
  bestScore: number;
};

export type MatchSummary = {
  id: string;
  mode: GameMode;
  playerId: string;
  opponent: string;
  result: 'victory' | 'defeat' | 'draw';
  score: number;
  opponentScore: number;
  completedAt: string;
};

export type RankEntry = {
  playerId: string;
  tag: string;
  score: number;
  wins: number;
  matches: number;
};

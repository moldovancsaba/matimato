export type PlayerSide = 'north' | 'south';
export type GameMode = 'solo' | 'battle' | 'daily';
export type GameStatus = 'waiting' | 'active' | 'complete';
export type LobbyStatus = 'waiting' | 'ready' | 'active' | 'expired' | 'cancelled';
export type TutorialStepId = 'first-pick' | 'column-target' | 'row-target' | 'negative-risk' | 'ai-turn' | 'finish';
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
  mode: GameMode;
  status: GameStatus;
  version: number;
  board: BoardCell[];
  players: Record<PlayerSide, PlayerState | null>;
  currentTurn: PlayerSide;
  legalTarget: LegalTarget;
  outcome?: GameOutcome;
  lobby?: LobbyState;
  createdAt: string;
  updatedAt: string;
};

export type LobbyState = {
  matchId: string;
  inviteCode: string;
  status: LobbyStatus;
  ready: Partial<Record<PlayerSide, boolean>>;
  expiresAt: string;
  cancelledAt?: string;
  lastSeenAt: Partial<Record<PlayerSide, string>>;
};

export type OnboardingState = {
  playerId: string;
  completedAt?: string;
  lastStep?: TutorialStepId;
  dismissedAt?: string;
  updatedAt: string;
};

export type CreateGameRequest = { type: 'create'; mode: GameMode; playerId: string; playerTag: string; lobbyVersion?: 2 };
export type JoinGameRequest = { type: 'join'; inviteCode: string; playerId: string; playerTag: string };
export type MoveRequest = { type: 'move'; matchId: string; playerId: string; actionId: string; row: number; col: number; expectedVersion: number };
export type SyncRequest = { type: 'sync'; matchId: string; playerId?: string };
export type LobbyStatusRequest = { type: 'lobbyStatus'; matchId: string; playerId: string };
export type LobbyReadyRequest = { type: 'ready'; matchId: string; playerId: string; actionId: string };
export type LobbyLeaveRequest = { type: 'leave' | 'cancel'; matchId: string; playerId: string; actionId: string };
export type GameRequest = CreateGameRequest | JoinGameRequest | MoveRequest | SyncRequest | LobbyStatusRequest | LobbyReadyRequest | LobbyLeaveRequest;

export type CreateJoinResponse = { snapshot: GameSnapshot };
export type MoveResponse = { snapshot: GameSnapshot; frames: MoveFrame[] };
export type SyncResponse = { snapshot: GameSnapshot; frames: MoveFrame[] };
export type LobbyResponse = { snapshot: GameSnapshot; lobby: LobbyState };
export type GameApiResponse = CreateJoinResponse | MoveResponse | SyncResponse | LobbyResponse;

export type ProfileSummary = {
  playerId: string;
  tag: string;
  level: number;
  xp: number;
  matches: number;
  wins: number;
  draws: number;
  bestScore: number;
  onboarding?: OnboardingState;
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

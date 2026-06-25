export type PlayerSide = 'north' | 'south';
export type GameMode = 'solo' | 'battle' | 'daily' | 'blitz';
export type GameStatus = 'waiting' | 'active' | 'complete';
export type LobbyStatus = 'waiting' | 'ready' | 'active' | 'expired' | 'cancelled';
export type TutorialStepId = 'first-pick' | 'column-target' | 'row-target' | 'negative-risk' | 'ai-turn' | 'finish';
export type TrainingChoice = 'learn' | 'play-now';
export type BoardSize = 5 | 6 | 7 | 8 | 9;
export type BlitzTimeoutPolicy = 'skip-turn' | 'forfeit-on-repeat';
export type TelemetryEventName =
  | 'onboarding_started'
  | 'training_choice_shown'
  | 'training_choice_selected'
  | 'onboarding_step_completed'
  | 'onboarding_skipped'
  | 'onboarding_completed'
  | 'onboarding_failed'
  | 'coach_bubble_shown'
  | 'coach_bubble_dismissed'
  | 'player_signed_out'
  | 'lobby_created'
  | 'lobby_copied'
  | 'lobby_shared'
  | 'lobby_joined'
  | 'lobby_ready'
  | 'lobby_expired'
  | 'lobby_cancelled'
  | 'lobby_poll_failed'
  | 'lobby_entered_match'
  | 'daily_viewed'
  | 'daily_started'
  | 'daily_resumed'
  | 'daily_completed'
  | 'streak_updated'
  | 'weekly_rank_viewed'
  | 'daily_error'
  | 'match_completed'
  | 'rank_viewed'
  | 'move_conflict'
  | 'sync_failed'
  | 'phaser_booted'
  | 'phaser_destroyed'
  | 'phaser_runtime_error'
  | 'api_error'
  | 'pwa_recovery'
  | 'blitz_started'
  | 'blitz_move_submitted'
  | 'blitz_deadline_warning'
  | 'blitz_timeout_requested'
  | 'blitz_timeout_resolved'
  | 'blitz_completed'
  | 'blitz_rematch_clicked'
  | 'blitz_abandoned'
  | 'recap_viewed'
  | 'recap_replay_started'
  | 'recap_shared'
  | 'rematch_started'
  | 'board_unlock_viewed'
  | 'board_unlock_purchased'
  | 'board_unlock_failed'
  | 'board_size_selected'
  | 'ios_runtime_detected'
  | 'ios_offline_state_changed'
  | 'ios_offline_retry'
  | 'ios_offline_recovered'
  | 'ios_wrapper_error';
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
  timeout?: TimeoutResolution;
};

export type GameOutcome = {
  winner: PlayerSide | 'draw';
  reason: 'board-complete' | 'no-legal-cells' | 'resigned' | 'timeout-forfeit';
};

export type BlitzClockConfig = {
  mode: 'perTurn';
  turnLimitMs: number;
  graceMs: number;
  timeoutPolicy: BlitzTimeoutPolicy;
};

export type ClockState = {
  enabled: boolean;
  serverNow: string;
  activeSide: PlayerSide;
  deadlineAt?: string;
  deadlineVersion?: number;
  timeoutCount: Record<PlayerSide, number>;
  config: BlitzClockConfig;
};

export type TimeoutResolution = {
  side: PlayerSide;
  deadlineVersion: number;
  policy: BlitzTimeoutPolicy;
  count: number;
};

export type GameSnapshot = {
  id: string;
  inviteCode: string;
  mode: GameMode;
  dailyId?: string;
  boardSize?: BoardSize;
  status: GameStatus;
  version: number;
  board: BoardCell[];
  players: Record<PlayerSide, PlayerState | null>;
  currentTurn: PlayerSide;
  legalTarget: LegalTarget;
  clock?: ClockState;
  moveLog?: MoveFrame[];
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
  trainingChoice?: TrainingChoice;
  trainingChoiceAt?: string;
  updatedAt: string;
};

export type DailyChallenge = {
  id: string;
  date: string;
  seed: string;
  startsAt: string;
  endsAt: string;
  boardSize: 9;
  status: 'available' | 'completed' | 'missed';
  resetAt: string;
};

export type DailyResult = {
  id: string;
  challengeId: string;
  playerId: string;
  tag: string;
  score: number;
  outcome: GameOutcome;
  attempts: number;
  completedAt: string;
};

export type StreakState = {
  current: number;
  best: number;
  lastCompletedDate?: string;
  protectedMisses: 0;
};

export type WeeklyRankEntry = {
  rank: number;
  playerHash: string;
  tag: string;
  score: number;
  attempts: number;
  completedAt: string;
};

export type QuestProgress = { id: string; title: string; progress: number; target: number; rewardXp: number };

export type XpWallet = {
  lifetimeXp: number;
  spendableXp: number;
};

export type BoardUnlock = {
  boardSize: BoardSize;
  costXp: number;
  purchasedAt: string;
  actionId: string;
};

export type NextBoardUnlock = {
  boardSize: BoardSize;
  costXp: number;
};

export type BoardUnlockState = {
  unlockedBoardSizes: BoardSize[];
  activeBoardSize: BoardSize;
  nextUnlock?: NextBoardUnlock;
  purchases: BoardUnlock[];
};

export type BoardProgression = {
  wallet: XpWallet;
  boardUnlocks: BoardUnlockState;
};

export type ProgressionResponse = {
  daily: DailyChallenge;
  dailyResult?: DailyResult;
  streak: StreakState;
  weeklyLeaderboard: WeeklyRankEntry[];
  quests: QuestProgress[];
  onboarding?: OnboardingState;
  progression?: BoardProgression;
};

export type TelemetryPropertyValue = string | number | boolean | null;
export type TelemetryEvent = {
  name: TelemetryEventName;
  version: 1;
  occurredAt: string;
  sessionHash: string;
  playerHash?: string;
  matchHash?: string;
  phase?: string;
  durationMs?: number;
  result?: 'ok' | 'error' | 'cancelled';
  properties: Record<string, TelemetryPropertyValue>;
};

export type TelemetryIngestResponse = { accepted: number; rejected: number; degraded?: boolean };

export type HealthCheck = { name: string; status: 'ok' | 'error'; latencyMs: number };

export type HealthResponse = {
  ok: boolean;
  database: 'connected' | 'error';
  version: string;
  checks: HealthCheck[];
};

export type CreateGameRequest = { type: 'create'; mode: GameMode; playerId: string; playerTag: string; lobbyVersion?: 2; dailyId?: string; boardSize?: BoardSize; clock?: Partial<Pick<BlitzClockConfig, 'turnLimitMs'>> };
export type JoinGameRequest = { type: 'join'; inviteCode: string; playerId: string; playerTag: string };
export type MoveRequest = { type: 'move'; matchId: string; playerId: string; actionId: string; row: number; col: number; expectedVersion: number };
export type SyncRequest = { type: 'sync'; matchId: string; playerId?: string };
export type TimeoutRequest = { type: 'timeout'; matchId: string; playerId: string; deadlineVersion: number };
export type LobbyStatusRequest = { type: 'lobbyStatus'; matchId: string; playerId: string };
export type LobbyReadyRequest = { type: 'ready'; matchId: string; playerId: string; actionId: string };
export type LobbyLeaveRequest = { type: 'leave' | 'cancel'; matchId: string; playerId: string; actionId: string };
export type GameRequest = CreateGameRequest | JoinGameRequest | MoveRequest | SyncRequest | TimeoutRequest | LobbyStatusRequest | LobbyReadyRequest | LobbyLeaveRequest;

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
  spendableXp: number;
  boardUnlocks: BoardUnlockState;
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

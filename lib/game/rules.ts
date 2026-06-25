import type { BlitzClockConfig, BoardCell, ClockState, GameMode, GameOutcome, GameSnapshot, LegalTarget, MoveFrame, PlayerSide, PlayerState, TimeoutResolution } from '@/lib/shared/types';

const SIZE = 9;
const SIDES: PlayerSide[] = ['north', 'south'];
export const DEFAULT_BLITZ_TURN_LIMIT_MS = 30_000;
export const DEFAULT_BLITZ_GRACE_MS = 1_500;
export const MAX_BLITZ_TIMEOUTS_BEFORE_FORFEIT = 2;

export function createPlayer(id: string, tag: string, side: PlayerSide): PlayerState {
  return { id, tag: tag.trim() || 'Player', side, score: 0 };
}

export function createBoard(seedText: string): BoardCell[] {
  const rand = seededRandom(seedText);
  const rows = shuffle([...Array(SIZE).keys()], rand);
  const cols = shuffle([...Array(SIZE).keys()], rand);
  const signs = createRandomSigns(rand);
  const board: BoardCell[] = [];
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      const magnitude = ((rows[r] * 3 + Math.floor(rows[r] / 3) + cols[c]) % SIZE) + 1;
      const sign = signs[r][c];
      board.push({ row: r, col: c, magnitude, sign, value: magnitude * sign, removed: false });
    }
  }
  return board;
}

export function newGame(id: string, mode: GameMode, playerId: string, tag: string, options?: { boardSeed?: string; dailyId?: string; clock?: Partial<Pick<BlitzClockConfig, 'turnLimitMs'>>; now?: Date }): GameSnapshot {
  const now = (options?.now ?? new Date()).toISOString();
  const north = createPlayer(playerId, tag, 'north');
  const south = mode === 'solo' || mode === 'daily' || mode === 'blitz' ? createPlayer('matimato-ai', 'Matimato AI', 'south') : null;
  const clockConfig = mode === 'blitz' ? createBlitzClockConfig(options?.clock) : undefined;
  return {
    id,
    inviteCode: makeInviteCode(id),
    mode,
    dailyId: options?.dailyId,
    status: mode === 'battle' ? 'waiting' : 'active',
    version: 0,
    board: createBoard(options?.boardSeed ?? `${id}:${mode}`),
    players: { north, south },
    currentTurn: 'north',
    legalTarget: { axis: 'any' },
    clock: clockConfig ? nextClock('north', 0, { north: 0, south: 0 }, clockConfig, new Date(now)) : undefined,
    moveLog: [],
    createdAt: now,
    updatedAt: now
  };
}

export function joinBattle(snapshot: GameSnapshot, playerId: string, tag: string): GameSnapshot {
  if (snapshot.mode !== 'battle') throw new Error('Only battle games can be joined.');
  if (snapshot.players.south && snapshot.players.south.id !== playerId) throw new Error('Battle already has two players.');
  return { ...snapshot, status: 'active', players: { ...snapshot.players, south: createPlayer(playerId, tag, 'south') }, updatedAt: new Date().toISOString() };
}

export function sideForPlayer(snapshot: GameSnapshot, playerId: string): PlayerSide | null {
  return SIDES.find((side) => snapshot.players[side]?.id === playerId) ?? null;
}

export function isLegal(target: LegalTarget, row: number, col: number, board: BoardCell[]): boolean {
  const cell = board.find((item) => item.row === row && item.col === col);
  if (!cell || cell.removed) return false;
  if (target.axis === 'any') return true;
  if (target.axis === 'row') return row === target.index;
  return col === target.index;
}

export function hasLegalCells(target: LegalTarget, board: BoardCell[]): boolean {
  return board.some((cell) => isLegal(target, cell.row, cell.col, board));
}

export function applyMove(snapshot: GameSnapshot, side: PlayerSide, row: number, col: number, actionId: string): { snapshot: GameSnapshot; frame: MoveFrame } {
  if (snapshot.status !== 'active') throw new Error('Game is not active.');
  if (snapshot.currentTurn !== side) throw new Error('It is not this player turn.');
  const now = new Date();
  if (isDeadlineExpired(snapshot, now)) throw new Error('TURN_DEADLINE_EXPIRED');
  if (!isLegal(snapshot.legalTarget, row, col, snapshot.board)) throw new Error('Illegal tile selection.');
  const fromTarget = snapshot.legalTarget;
  const board = snapshot.board.map((cell) => cell.row === row && cell.col === col ? { ...cell, removed: true } : cell);
  const selected = snapshot.board.find((cell) => cell.row === row && cell.col === col)!;
  const scores = { north: snapshot.players.north?.score ?? 0, south: snapshot.players.south?.score ?? 0 };
  scores[side] += selected.value;
  const nextSide: PlayerSide = side === 'north' ? 'south' : 'north';
  const toTarget: LegalTarget = fromTarget.axis === 'column' ? { axis: 'row', index: row } : { axis: 'column', index: col };
  const outcome = computeOutcome(board, toTarget, scores);
  const updatedAt = now.toISOString();
  const frame: MoveFrame = { actionId, version: snapshot.version + 1, side, selected: { row, col, value: selected.value }, fromTarget, toTarget, scores, outcome };
  const nextSnapshot: GameSnapshot = {
    ...snapshot,
    version: snapshot.version + 1,
    board,
    players: {
      north: snapshot.players.north ? { ...snapshot.players.north, score: scores.north } : null,
      south: snapshot.players.south ? { ...snapshot.players.south, score: scores.south } : null
    },
    currentTurn: nextSide,
    legalTarget: toTarget,
    clock: snapshot.clock && !outcome ? nextClock(nextSide, snapshot.version + 1, snapshot.clock.timeoutCount, snapshot.clock.config, now) : stopClock(snapshot.clock, now),
    moveLog: [...(snapshot.moveLog ?? []), frame],
    outcome,
    status: outcome ? 'complete' : 'active',
    updatedAt
  };
  return {
    snapshot: nextSnapshot,
    frame
  };
}

export function createBlitzClockConfig(input?: Partial<Pick<BlitzClockConfig, 'turnLimitMs'>>): BlitzClockConfig {
  const turnLimitMs = Number(input?.turnLimitMs ?? DEFAULT_BLITZ_TURN_LIMIT_MS);
  if (!Number.isInteger(turnLimitMs) || turnLimitMs < 5_000 || turnLimitMs > 120_000) throw new Error('INVALID_CLOCK_CONFIG');
  return { mode: 'perTurn', turnLimitMs, graceMs: DEFAULT_BLITZ_GRACE_MS, timeoutPolicy: 'forfeit-on-repeat' };
}

export function isDeadlineExpired(snapshot: GameSnapshot, now = new Date()): boolean {
  if (!snapshot.clock?.enabled || !snapshot.clock.deadlineAt) return false;
  return now.getTime() > new Date(snapshot.clock.deadlineAt).getTime() + snapshot.clock.config.graceMs;
}

export function applyTimeout(snapshot: GameSnapshot, side: PlayerSide, deadlineVersion: number, now = new Date()): { snapshot: GameSnapshot; frames: MoveFrame[]; resolved: boolean } {
  if (snapshot.status !== 'active' || !snapshot.clock?.enabled || !snapshot.clock.deadlineAt) return { snapshot, frames: [], resolved: false };
  if (snapshot.currentTurn !== side || snapshot.clock.activeSide !== side) return { snapshot, frames: [], resolved: false };
  if (snapshot.clock.deadlineVersion !== deadlineVersion) return { snapshot, frames: [], resolved: false };
  if (!isDeadlineExpired(snapshot, now)) return { snapshot, frames: [], resolved: false };

  const counts = { ...snapshot.clock.timeoutCount, [side]: snapshot.clock.timeoutCount[side] + 1 };
  const nextSide: PlayerSide = side === 'north' ? 'south' : 'north';
  const scores = { north: snapshot.players.north?.score ?? 0, south: snapshot.players.south?.score ?? 0 };
  const forfeit = counts[side] >= MAX_BLITZ_TIMEOUTS_BEFORE_FORFEIT;
  const timeout: TimeoutResolution = { side, deadlineVersion, policy: snapshot.clock.config.timeoutPolicy, count: counts[side] };
  const outcome: GameOutcome | undefined = forfeit ? { winner: nextSide, reason: 'timeout-forfeit' } : undefined;
  const version = snapshot.version + 1;
  const frame: MoveFrame = {
    actionId: `timeout:${snapshot.id}:${side}:${deadlineVersion}`,
    version,
    side,
    selected: { row: -1, col: -1, value: 0 },
    fromTarget: snapshot.legalTarget,
    toTarget: snapshot.legalTarget,
    scores,
    outcome,
    timeout
  };
  const next: GameSnapshot = {
    ...snapshot,
    version,
    currentTurn: forfeit ? snapshot.currentTurn : nextSide,
    clock: forfeit ? stopClock(snapshot.clock, now) : nextClock(nextSide, version, counts, snapshot.clock.config, now),
    outcome,
    status: outcome ? 'complete' : 'active',
    moveLog: [...(snapshot.moveLog ?? []), frame],
    updatedAt: now.toISOString()
  };
  return { snapshot: next, frames: [frame], resolved: true };
}

export function chooseAiMove(snapshot: GameSnapshot): { row: number; col: number } | null {
  const legal = snapshot.board.filter((cell) => isLegal(snapshot.legalTarget, cell.row, cell.col, snapshot.board));
  if (!legal.length) return null;
  const best = legal.sort((a, b) => b.value - a.value || a.row - b.row || a.col - b.col)[0];
  return { row: best.row, col: best.col };
}

export function nextClock(activeSide: PlayerSide, deadlineVersion: number, timeoutCount: Record<PlayerSide, number>, config: BlitzClockConfig, now = new Date()): ClockState {
  const serverNow = now.toISOString();
  return {
    enabled: true,
    serverNow,
    activeSide,
    deadlineAt: new Date(now.getTime() + config.turnLimitMs).toISOString(),
    deadlineVersion,
    timeoutCount,
    config
  };
}

function stopClock(clock: ClockState | undefined, now: Date): ClockState | undefined {
  if (!clock) return undefined;
  return { ...clock, enabled: false, serverNow: now.toISOString(), deadlineAt: undefined };
}

export function computeOutcome(board: BoardCell[], target: LegalTarget, scores: Record<PlayerSide, number>): GameOutcome | undefined {
  if (board.every((cell) => cell.removed)) return winner(scores, 'board-complete');
  if (!hasLegalCells(target, board)) return winner(scores, 'no-legal-cells');
  return undefined;
}

function winner(scores: Record<PlayerSide, number>, reason: GameOutcome['reason']): GameOutcome {
  if (scores.north === scores.south) return { winner: 'draw', reason };
  return { winner: scores.north > scores.south ? 'north' : 'south', reason };
}

function makeInviteCode(id: string): string {
  return id.replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase().padEnd(5, 'M');
}


function createRandomSigns(rand: () => number): (1 | -1)[][] {
  const signs: (1 | -1)[][] = [];
  const rowNegatives = Array.from({ length: SIZE }, () => 0);
  const colNegatives = Array.from({ length: SIZE }, () => 0);
  for (let row = 0; row < SIZE; row += 1) {
    signs[row] = [];
    for (let col = 0; col < SIZE; col += 1) {
      const rowNeed = rowNegatives[row] < 2;
      const colNeed = colNegatives[col] < 2 && row >= SIZE - 3;
      const rowFull = rowNegatives[row] >= 5;
      const colFull = colNegatives[col] >= 5;
      const previousHorizontal = col >= 2 && signs[row][col - 1] === -1 && signs[row][col - 2] === -1;
      const previousVertical = row >= 2 && signs[row - 1][col] === -1 && signs[row - 2][col] === -1;
      let negative = rand() < 0.38;
      if (rowNeed && col >= SIZE - 3) negative = true;
      if (colNeed) negative = true;
      if (rowFull || colFull || previousHorizontal || previousVertical) negative = false;
      signs[row][col] = negative ? -1 : 1;
      if (negative) {
        rowNegatives[row] += 1;
        colNegatives[col] += 1;
      }
    }
  }
  return signs;
}

function seededRandom(seedText: string): () => number {
  let seed = 2166136261;
  for (const char of seedText) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  return () => {
    seed += 0x6d2b79f5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

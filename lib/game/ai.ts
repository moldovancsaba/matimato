import type { BoardCell, BotProfile, BotProfileSummary, GameSnapshot, LegalTarget } from '@/lib/shared/types';

export const DEFAULT_BOT_PROFILE_ID = 'rookie-guide';

export const BOT_PROFILES: readonly BotProfile[] = [
  {
    profileId: 'rookie-guide',
    name: 'Mati Rookie',
    difficulty: 'rookie',
    unlockBoardSize: 5,
    description: 'Learns the board and prefers simple positive tiles.',
    weights: { immediateScore: 1, denyPlayerScore: 0.15, trapAvoidance: 0.65, lineControl: 0.2, endgameMobility: 0.1, riskTolerance: 0.1 },
    maxDecisionMs: 40
  },
  {
    profileId: 'steady-runner',
    name: 'Steady Mato',
    difficulty: 'steady',
    unlockBoardSize: 6,
    description: 'Balances points with safer targets.',
    weights: { immediateScore: 1.1, denyPlayerScore: 0.45, trapAvoidance: 0.9, lineControl: 0.55, endgameMobility: 0.35, riskTolerance: 0.25 },
    maxDecisionMs: 60
  },
  {
    profileId: 'sharp-cutter',
    name: 'Sharp Mato',
    difficulty: 'sharp',
    unlockBoardSize: 7,
    description: 'Pressures rows and columns to deny easy replies.',
    weights: { immediateScore: 1.05, denyPlayerScore: 0.9, trapAvoidance: 0.75, lineControl: 0.95, endgameMobility: 0.55, riskTolerance: 0.55 },
    maxDecisionMs: 80
  },
  {
    profileId: 'expert-lock',
    name: 'Lock Mato',
    difficulty: 'expert',
    unlockBoardSize: 8,
    description: 'Plays for endgame control and accepts calculated risk.',
    weights: { immediateScore: 1, denyPlayerScore: 1.15, trapAvoidance: 0.65, lineControl: 1.2, endgameMobility: 0.9, riskTolerance: 0.85 },
    maxDecisionMs: 100
  }
];

export function summarizeBotProfile(profile: BotProfile): BotProfileSummary {
  const { profileId, name, difficulty, unlockBoardSize, description } = profile;
  return { profileId, name, difficulty, unlockBoardSize, description };
}

export function getBotProfile(profileId: string | undefined, boardSize = 5): BotProfile {
  const requested = BOT_PROFILES.find((profile) => profile.profileId === profileId);
  if (requested && requested.unlockBoardSize <= boardSize) return requested;
  return BOT_PROFILES.find((profile) => profile.profileId === DEFAULT_BOT_PROFILE_ID)!;
}

export function availableBotProfiles(boardSize: number): BotProfileSummary[] {
  return BOT_PROFILES.filter((profile) => profile.unlockBoardSize <= boardSize).map(summarizeBotProfile);
}

export function chooseProfiledBotMove(snapshot: GameSnapshot, profileId?: string, seed = snapshot.id): { row: number; col: number; profile: BotProfile; durationMs: number; fallback: boolean } | null {
  const startedAt = Date.now();
  const profile = getBotProfile(profileId ?? snapshot.botProfile?.profileId, snapshot.boardSize ?? 5);
  const legal = legalCells(snapshot.board, snapshot.legalTarget);
  if (!legal.length) return null;
  const scored = legal.map((cell) => ({ cell, score: scoreMove(snapshot, cell, profile) }));
  const best = deterministicMax(scored, `${seed}:${snapshot.version}:${profile.profileId}`);
  const durationMs = Date.now() - startedAt;
  const fallback = durationMs > profile.maxDecisionMs;
  const move = fallback ? deterministicMax(legal.map((cell) => ({ cell, score: cell.value })), `${seed}:fallback:${snapshot.version}`) : best;
  return { row: move.cell.row, col: move.cell.col, profile, durationMs, fallback };
}

function scoreMove(snapshot: GameSnapshot, cell: BoardCell, profile: BotProfile): number {
  const nextTarget = targetAfterMove(snapshot.legalTarget, cell);
  const nextLegal = legalCells(snapshot.board.filter((item) => item !== cell), nextTarget);
  const playerBest = nextLegal.length ? Math.max(...nextLegal.map((item) => item.value)) : 0;
  const negativePenalty = cell.value < 0 ? Math.abs(cell.value) : 0;
  const lineBalance = lineControl(snapshot.board, cell);
  const endgame = nextLegal.length <= 2 ? 2 - nextLegal.length : 0;
  return (
    cell.value * profile.weights.immediateScore +
    -playerBest * profile.weights.denyPlayerScore +
    -negativePenalty * (profile.weights.trapAvoidance - profile.weights.riskTolerance) +
    lineBalance * profile.weights.lineControl +
    endgame * profile.weights.endgameMobility
  );
}

function legalCells(board: BoardCell[], target: LegalTarget): BoardCell[] {
  return board.filter((cell) => {
    if (cell.removed) return false;
    if (target.axis === 'any') return true;
    if (target.axis === 'row') return cell.row === target.index;
    return cell.col === target.index;
  });
}

function targetAfterMove(target: LegalTarget, cell: BoardCell): LegalTarget {
  return target.axis === 'column' ? { axis: 'row', index: cell.row } : { axis: 'column', index: cell.col };
}

function lineControl(board: BoardCell[], cell: BoardCell): number {
  const rowScore = board.filter((item) => !item.removed && item.row === cell.row).reduce((total, item) => total + item.value, 0);
  const colScore = board.filter((item) => !item.removed && item.col === cell.col).reduce((total, item) => total + item.value, 0);
  return -(rowScore + colScore) / 2;
}

function deterministicMax<T extends { score: number; cell: BoardCell }>(items: T[], seed: string): T {
  return [...items].sort((a, b) => b.score - a.score || hashCell(seed, a.cell) - hashCell(seed, b.cell))[0];
}

function hashCell(seed: string, cell: BoardCell): number {
  let hash = 2166136261;
  for (const char of `${seed}:${cell.row}:${cell.col}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

import type { BoardSize, GameSnapshot, PlayerSide, ReplayFrame, ReplaySnapshot, ReplayVisibility } from '@/lib/shared/types';

const VALID_BOARD_SIZES = new Set([5, 6, 7, 8, 9]);

export function resolveReplayVisibility(snapshot: GameSnapshot & { replayVisibility?: ReplayVisibility; shareExpiresAt?: string }, now = new Date()): ReplayVisibility {
  const explicit = snapshot.replayVisibility;
  if (explicit === 'private') return 'private';
  if (snapshot.shareExpiresAt && Date.parse(snapshot.shareExpiresAt) <= now.getTime()) return 'expired';
  return explicit ?? 'public-link';
}

export function buildReplaySnapshot(snapshot: GameSnapshot & { replayVisibility?: ReplayVisibility; shareExpiresAt?: string }, now = new Date()): ReplaySnapshot {
  if (snapshot.status !== 'complete' || !snapshot.outcome) throw new Error('REPLAY_NOT_COMPLETE');
  const visibility = resolveReplayVisibility(snapshot, now);
  if (visibility === 'private') throw new Error('REPLAY_PRIVATE');
  if (visibility === 'expired') throw new Error('REPLAY_EXPIRED');
  const boardSize = normalizeReplayBoardSize(snapshot.boardSize);
  const frames = sanitizeReplayFrames(snapshot.moveLog ?? []);
  return {
    replayId: snapshot.id,
    matchId: snapshot.id,
    mode: snapshot.mode,
    boardSize,
    outcome: snapshot.outcome,
    players: (['north', 'south'] as PlayerSide[])
      .map((side) => snapshot.players[side] ? { side, tag: sanitizeReplayTag(snapshot.players[side]!.tag, side), score: snapshot.players[side]!.score } : null)
      .filter((player): player is { side: PlayerSide; tag: string; score: number } => Boolean(player)),
    frames,
    completedAt: snapshot.updatedAt || snapshot.createdAt,
    visibility,
    shareExpiresAt: snapshot.shareExpiresAt,
    summaryOnly: frames.length === 0
  };
}

export function sanitizeReplayFrames(frames: unknown[]): ReplayFrame[] {
  const sanitized: ReplayFrame[] = [];
  for (const frame of frames) {
    if (!frame || typeof frame !== 'object') continue;
    const raw = frame as Partial<ReplayFrame>;
    if (!raw.selected || typeof raw.version !== 'number' || (raw.side !== 'north' && raw.side !== 'south')) continue;
    sanitized.push({
        version: raw.version,
        side: raw.side,
        selected: {
          row: Number(raw.selected.row ?? 0),
          col: Number(raw.selected.col ?? 0),
          value: Number(raw.selected.value ?? 0)
        },
        fromTarget: raw.fromTarget ?? { axis: 'any' },
        toTarget: raw.toTarget ?? { axis: 'any' },
        scores: {
          north: Number(raw.scores?.north ?? 0),
          south: Number(raw.scores?.south ?? 0)
        },
        timeout: raw.timeout,
        outcome: raw.outcome
      });
  }
  return sanitized;
}

export function sanitizeReplayTag(value: string | undefined, side: PlayerSide): string {
  const tag = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!tag) return side === 'north' ? 'North player' : 'South player';
  return tag.slice(0, 32);
}

function normalizeReplayBoardSize(value: unknown): BoardSize {
  return typeof value === 'number' && VALID_BOARD_SIZES.has(value) ? value as BoardSize : 9;
}

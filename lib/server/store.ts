import type { GameSnapshot, MatchSummary, ProfileSummary, RankEntry } from '@/lib/shared/types';
import { getDb } from './mongo';

const GAMES = 'games';
const HISTORY = 'history';
const PROFILES = 'profiles';

export async function saveGame(snapshot: GameSnapshot): Promise<void> {
  const db = await getDb();
  await db.collection<GameSnapshot>(GAMES).updateOne({ id: snapshot.id }, { $set: { ...snapshot, code: snapshot.inviteCode } }, { upsert: true });
}

export async function findGame(id: string): Promise<GameSnapshot | null> {
  const db = await getDb();
  return db.collection<GameSnapshot>(GAMES).findOne({ id }, { projection: { _id: 0 } });
}

export async function findGameByInvite(inviteCode: string): Promise<GameSnapshot | null> {
  const db = await getDb();
  return db.collection<GameSnapshot>(GAMES).findOne({ $or: [{ inviteCode: inviteCode.toUpperCase() }, { code: inviteCode.toUpperCase() }] }, { projection: { _id: 0 } });
}

export async function completeGame(snapshot: GameSnapshot): Promise<void> {
  if (!snapshot.outcome) return;
  const db = await getDb();
  const completedAt = new Date().toISOString();
  const players = [snapshot.players.north, snapshot.players.south].filter(Boolean);
  for (const player of players) {
    const opponent = player!.side === 'north' ? snapshot.players.south : snapshot.players.north;
    const score = player!.score;
    const opponentScore = opponent?.score ?? 0;
    const result = snapshot.outcome.winner === 'draw' ? 'draw' : snapshot.outcome.winner === player!.side ? 'victory' : 'defeat';
    const summary: MatchSummary = { id: `${snapshot.id}:${player!.id}`, mode: snapshot.mode, playerId: player!.id, opponent: opponent?.tag ?? 'Open seat', result, score, opponentScore, completedAt };
    await db.collection<MatchSummary>(HISTORY).updateOne({ id: summary.id }, { $set: summary }, { upsert: true });
    const xp = Math.max(10, Math.abs(score) + (result === 'victory' ? 80 : result === 'draw' ? 35 : 20));
    await db.collection(PROFILES).updateOne(
      { playerId: player!.id },
      {
        $set: { playerId: player!.id, tag: player!.tag },
        $inc: { xp, matches: 1, wins: result === 'victory' ? 1 : 0, draws: result === 'draw' ? 1 : 0 },
        $max: { bestScore: score }
      },
      { upsert: true }
    );
  }
}

export async function getProfile(playerId: string, fallbackTag = 'Player'): Promise<ProfileSummary> {
  const db = await getDb();
  const raw = await db.collection(PROFILE_DOC).findOne({ playerId }, { projection: { _id: 0 } });
  const xp = Number(raw?.xp ?? 0);
  return { playerId, tag: String(raw?.tag ?? fallbackTag), xp, level: Math.max(1, Math.floor(xp / 150) + 1), matches: Number(raw?.matches ?? 0), wins: Number(raw?.wins ?? 0), draws: Number(raw?.draws ?? 0), bestScore: Number(raw?.bestScore ?? 0) };
}

const PROFILE_DOC = PROFILES;

export async function getHistory(playerId: string): Promise<MatchSummary[]> {
  const db = await getDb();
  return db.collection<MatchSummary>(HISTORY).find({ playerId }, { projection: { _id: 0 } }).sort({ completedAt: -1 }).limit(30).toArray();
}

export async function getLeaderboard(): Promise<RankEntry[]> {
  const db = await getDb();
  const rows = await db.collection(PROFILES).find({}, { projection: { _id: 0 } }).sort({ xp: -1, wins: -1 }).limit(50).toArray();
  return rows.map((row) => ({ playerId: String(row.playerId), tag: String(row.tag ?? 'Player'), score: Number(row.xp ?? 0), wins: Number(row.wins ?? 0), matches: Number(row.matches ?? 0) }));
}

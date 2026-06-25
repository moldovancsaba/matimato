import { createDailyChallenge, createEmptyStreak, getWeekEndExclusive, getWeekStart, rankWeeklyResults, updateStreak } from '@/lib/game/daily';
import { applyBoardPurchase, createProgression, normalizeBoardSize, selectActiveBoard } from '@/lib/game/progression';
import type { BoardProgression, BoardSize, DailyResult, GameSnapshot, MatchSummary, OnboardingState, ProfileSummary, ProgressionResponse, RankEntry, StreakState, TrainingChoice, TutorialStepId } from '@/lib/shared/types';
import { getDb } from './mongo';

const GAMES = 'games';
const HISTORY = 'history';
const PROFILES = 'profiles';
const DAILY_RESULTS = 'dailyResults';

export async function saveGame(snapshot: GameSnapshot): Promise<void> {
  const db = await getDb();
  await db.collection<GameSnapshot>(GAMES).updateOne({ id: snapshot.id }, { $set: snapshot }, { upsert: true });
}

export async function findGame(id: string): Promise<GameSnapshot | null> {
  const db = await getDb();
  return db.collection<GameSnapshot>(GAMES).findOne({ id }, { projection: { _id: 0 } });
}

export async function findGameByInvite(inviteCode: string): Promise<GameSnapshot | null> {
  const db = await getDb();
  return db.collection<GameSnapshot>(GAMES).findOne({ inviteCode: inviteCode.toUpperCase() }, { projection: { _id: 0 } });
}

export async function findActiveDailyGame(playerId: string, dailyId: string): Promise<GameSnapshot | null> {
  const db = await getDb();
  return db.collection<GameSnapshot>(GAMES).findOne(
    { mode: 'daily', dailyId, status: 'active', 'players.north.id': playerId },
    { projection: { _id: 0 }, sort: { updatedAt: -1 } }
  );
}

export async function findDailyResult(playerId: string, dailyId: string): Promise<DailyResult | null> {
  const db = await getDb();
  return db.collection<DailyResult>(DAILY_RESULTS).findOne({ id: `${dailyId}:${playerId}` }, { projection: { _id: 0 } });
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
    const existingHistory = await db.collection<MatchSummary>(HISTORY).findOne({ id: summary.id }, { projection: { _id: 1 } });
    await db.collection<MatchSummary>(HISTORY).updateOne({ id: summary.id }, { $setOnInsert: summary }, { upsert: true });
    if (!existingHistory) {
      const xp = Math.max(10, Math.abs(score) + (result === 'victory' ? 80 : result === 'draw' ? 35 : 20));
      const currentProfile = await db.collection(PROFILES).findOne({ playerId: player!.id }, { projection: { _id: 0 } });
      const currentProgression = createProgression(currentProfile ?? {});
      await db.collection(PROFILES).updateOne(
        { playerId: player!.id },
        {
          $set: { playerId: player!.id, tag: player!.tag, spendableXp: currentProgression.wallet.spendableXp + xp },
          $inc: { xp, matches: 1, wins: result === 'victory' ? 1 : 0, draws: result === 'draw' ? 1 : 0 },
          $max: { bestScore: score }
        },
        { upsert: true }
      );
    }
    if (snapshot.mode === 'daily' && snapshot.dailyId && player!.side === 'north') {
      await upsertDailyResult({
        challengeId: snapshot.dailyId,
        playerId: player!.id,
        tag: player!.tag,
        score,
        outcome: snapshot.outcome,
        completedAt
      });
    }
  }
}

export async function getProfile(playerId: string, fallbackTag = 'Player'): Promise<ProfileSummary> {
  const db = await getDb();
  const raw = await db.collection(PROFILE_DOC).findOne({ playerId }, { projection: { _id: 0 } });
  const xp = Number(raw?.xp ?? 0);
  const progression = createProgression(raw ?? { xp });
  return {
    playerId,
    tag: String(raw?.tag ?? fallbackTag),
    xp,
    spendableXp: progression.wallet.spendableXp,
    boardUnlocks: progression.boardUnlocks,
    level: Math.max(1, Math.floor(xp / 150) + 1),
    matches: Number(raw?.matches ?? 0),
    wins: Number(raw?.wins ?? 0),
    draws: Number(raw?.draws ?? 0),
    bestScore: Number(raw?.bestScore ?? 0),
    onboarding: normalizeOnboarding(playerId, raw?.onboarding)
  };
}

const PROFILE_DOC = PROFILES;

export async function getOnboarding(playerId: string): Promise<OnboardingState> {
  const profile = await getProfile(playerId);
  return profile.onboarding ?? createEmptyOnboarding(playerId);
}

export async function updateOnboarding(input: { playerId: string; step?: TutorialStepId; completed?: boolean; dismissed?: boolean; trainingChoice?: TrainingChoice }): Promise<OnboardingState> {
  const db = await getDb();
  const current = await getOnboarding(input.playerId);
  const now = new Date().toISOString();
  const onboarding: OnboardingState = {
    ...current,
    playerId: input.playerId,
    lastStep: input.step ?? current.lastStep,
    completedAt: input.completed ? current.completedAt ?? now : current.completedAt,
    dismissedAt: input.dismissed ? current.dismissedAt ?? now : current.dismissedAt,
    trainingChoice: input.trainingChoice ?? current.trainingChoice,
    trainingChoiceAt: input.trainingChoice ? current.trainingChoiceAt ?? now : current.trainingChoiceAt,
    updatedAt: now
  };
  await db.collection(PROFILES).updateOne(
    { playerId: input.playerId },
    { $set: { playerId: input.playerId, onboarding } },
    { upsert: true }
  );
  return onboarding;
}

export async function getHistory(playerId: string): Promise<MatchSummary[]> {
  const db = await getDb();
  return db.collection<MatchSummary>(HISTORY).find({ playerId }, { projection: { _id: 0 } }).sort({ completedAt: -1 }).limit(30).toArray();
}

export async function getLeaderboard(): Promise<RankEntry[]> {
  const db = await getDb();
  const rows = await db.collection(PROFILES).find({}, { projection: { _id: 0 } }).sort({ xp: -1, wins: -1 }).limit(50).toArray();
  return rows.map((row) => ({ playerId: String(row.playerId), tag: String(row.tag ?? 'Player'), score: Number(row.xp ?? 0), wins: Number(row.wins ?? 0), matches: Number(row.matches ?? 0) }));
}

export async function getProgression(playerId?: string, now = new Date()): Promise<ProgressionResponse> {
  const today = createDailyChallenge(now);
  const db = await getDb();
  const dailyResult = playerId ? await db.collection<DailyResult>(DAILY_RESULTS).findOne({ id: `${today.id}:${playerId}` }, { projection: { _id: 0 } }) : null;
  const daily = createDailyChallenge(now, dailyResult ?? undefined);
  const profile = playerId ? await db.collection(PROFILES).findOne({ playerId }, { projection: { _id: 0 } }) : null;
  const weekStart = getWeekStart(today.id);
  const weekEnd = getWeekEndExclusive(today.id);
  const weeklyResults = await db.collection<DailyResult>(DAILY_RESULTS)
    .find({ challengeId: { $gte: weekStart, $lt: weekEnd } }, { projection: { _id: 0 } })
    .sort({ score: -1, completedAt: 1, attempts: 1 })
    .limit(50)
    .toArray();
  const onboarding = playerId ? normalizeOnboarding(playerId, profile?.onboarding) ?? createEmptyOnboarding(playerId) : undefined;
  const progression = playerId ? createProgression(profile ?? {}) : undefined;
  return {
    daily,
    dailyResult: dailyResult ?? undefined,
    streak: normalizeStreak(profile?.streak),
    weeklyLeaderboard: rankWeeklyResults(weeklyResults),
    quests: [
      { id: 'finish-one', title: 'Finish one match', progress: dailyResult ? 1 : 0, target: 1, rewardXp: 80 },
      { id: 'win-two', title: 'Win two duels', progress: Number(profile?.wins ?? 0), target: 2, rewardXp: 140 },
      { id: 'positive-row', title: 'Claim a positive row swing', progress: dailyResult && dailyResult.score > 0 ? 1 : 0, target: 1, rewardXp: 60 }
    ],
    onboarding,
    progression
  };
}

export async function getPlayerProgression(playerId: string): Promise<BoardProgression> {
  const db = await getDb();
  const raw = await db.collection(PROFILES).findOne({ playerId }, { projection: { _id: 0 } });
  return createProgression(raw ?? {});
}

export async function purchaseBoardUnlock(input: { playerId: string; boardSize: BoardSize; actionId: string }): Promise<BoardProgression> {
  const db = await getDb();
  const raw = await db.collection(PROFILES).findOne({ playerId: input.playerId }, { projection: { _id: 0 } });
  const current = createProgression(raw ?? {});
  const duplicate = current.boardUnlocks.purchases.some((purchase) => purchase.actionId === input.actionId || purchase.boardSize === input.boardSize);
  const next = duplicate ? current : applyBoardPurchase(current, input.boardSize, input.actionId);
  await db.collection(PROFILES).updateOne(
    { playerId: input.playerId },
    {
      $set: {
        playerId: input.playerId,
        spendableXp: next.wallet.spendableXp,
        boardUnlocks: next.boardUnlocks
      },
      $setOnInsert: { xp: next.wallet.lifetimeXp }
    },
    { upsert: true }
  );
  return next;
}

export async function updateActiveBoardSize(input: { playerId: string; boardSize: BoardSize }): Promise<BoardProgression> {
  const db = await getDb();
  const raw = await db.collection(PROFILES).findOne({ playerId: input.playerId }, { projection: { _id: 0 } });
  const current = createProgression(raw ?? {});
  const next = selectActiveBoard(current, input.boardSize);
  await db.collection(PROFILES).updateOne(
    { playerId: input.playerId },
    { $set: { playerId: input.playerId, spendableXp: next.wallet.spendableXp, boardUnlocks: next.boardUnlocks }, $setOnInsert: { xp: next.wallet.lifetimeXp } },
    { upsert: true }
  );
  return next;
}

export async function resolveBoardSizeForGame(playerId: string, requested?: BoardSize): Promise<BoardSize> {
  if (process.env.MATIMATO_BOARD_JOURNEY_ENABLED === 'false' || process.env.NEXT_PUBLIC_MATIMATO_BOARD_JOURNEY === 'false') return 9;
  const progression = await getPlayerProgression(playerId);
  const boardSize = normalizeBoardSize(requested ?? progression.boardUnlocks.activeBoardSize, 5);
  if (!progression.boardUnlocks.unlockedBoardSizes.includes(boardSize)) throw new Error('BOARD_LOCKED');
  return boardSize;
}

async function upsertDailyResult(input: Omit<DailyResult, 'id' | 'attempts'>): Promise<void> {
  const db = await getDb();
  const id = `${input.challengeId}:${input.playerId}`;
  const existing = await db.collection<DailyResult>(DAILY_RESULTS).findOne({ id }, { projection: { _id: 0 } });
  if (existing?.completedAt) return;
  const attempts = Math.max(1, existing?.attempts ?? 1);
  const result: DailyResult = { id, attempts, ...input };
  const currentProfile = await db.collection(PROFILES).findOne({ playerId: input.playerId }, { projection: { _id: 0 } });
  const streak = updateStreak(normalizeStreak(currentProfile?.streak), input.challengeId);
  await db.collection<DailyResult>(DAILY_RESULTS).updateOne({ id }, { $setOnInsert: result }, { upsert: true });
  await db.collection(PROFILES).updateOne(
    { playerId: input.playerId },
    {
      $set: { playerId: input.playerId, tag: input.tag, streak },
      $max: { bestDailyScore: input.score }
    },
    { upsert: true }
  );
}

function createEmptyOnboarding(playerId: string): OnboardingState {
  return { playerId, updatedAt: new Date(0).toISOString() };
}

function normalizeOnboarding(playerId: string, value: unknown): OnboardingState | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Partial<OnboardingState>;
  return {
    playerId,
    completedAt: typeof raw.completedAt === 'string' ? raw.completedAt : undefined,
    dismissedAt: typeof raw.dismissedAt === 'string' ? raw.dismissedAt : undefined,
    lastStep: raw.lastStep,
    trainingChoice: raw.trainingChoice,
    trainingChoiceAt: typeof raw.trainingChoiceAt === 'string' ? raw.trainingChoiceAt : undefined,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date(0).toISOString()
  };
}

function normalizeStreak(value: unknown): StreakState {
  if (!value || typeof value !== 'object') return createEmptyStreak();
  const raw = value as Partial<StreakState>;
  return {
    current: Number(raw.current ?? 0),
    best: Number(raw.best ?? 0),
    lastCompletedDate: typeof raw.lastCompletedDate === 'string' ? raw.lastCompletedDate : undefined,
    protectedMisses: 0
  };
}

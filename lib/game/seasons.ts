import type { ActiveSeasonState, BadgeAlbum, BoardSize, SeasonDefinition, SeasonProgress, SeasonReward, SeasonRewardGrant, SeasonTaskSource } from '@/lib/shared/types';

export type SeasonActionInput = {
  playerId: string;
  source: SeasonTaskSource;
  metric: 'complete_match' | 'win_match' | 'score_threshold' | 'unlock_board' | 'replay_move' | 'share_recap' | 'view_rank';
  actionId: string;
  completedAt?: string;
  score?: number;
  boardSize?: BoardSize;
};

export type SeasonClaimResult = {
  state: ActiveSeasonState;
  reward: SeasonReward;
  grant: SeasonRewardGrant;
  newlyClaimed: boolean;
};

export const DEFAULT_SEASON: SeasonDefinition = {
  seasonId: 'founders-chase-2026',
  title: 'Founders chase',
  startsAt: '2026-01-01T00:00:00.000Z',
  endsAt: '2027-01-01T00:00:00.000Z',
  claimUntil: '2027-01-08T00:00:00.000Z',
  version: 1,
  tasks: [
    { taskId: 'finish-matches', title: 'Finish matches', source: 'solo', metric: 'complete_match', target: 3, weight: 12 },
    { taskId: 'win-duels', title: 'Win duels', source: 'solo', metric: 'win_match', target: 2, weight: 18 },
    { taskId: 'blitz-sprints', title: 'Complete Blitz sprints', source: 'blitz', metric: 'complete_match', target: 2, weight: 16 },
    { taskId: 'daily-chases', title: 'Finish daily boards', source: 'daily', metric: 'complete_match', target: 2, weight: 16 },
    { taskId: 'journey-unlocks', title: 'Unlock larger boards', source: 'journey', metric: 'unlock_board', target: 2, weight: 22 },
    { taskId: 'share-recaps', title: 'Share recaps', source: 'recap', metric: 'share_recap', target: 1, weight: 10 }
  ],
  collectibles: [
    { collectibleId: 'first-claim', name: 'First claim', taskId: 'finish-matches', threshold: 1 },
    { collectibleId: 'duel-spark', name: 'Duel spark', taskId: 'win-duels', threshold: 1 },
    { collectibleId: 'blitz-mark', name: 'Blitz mark', taskId: 'blitz-sprints', threshold: 1 },
    { collectibleId: 'daily-seal', name: 'Daily seal', taskId: 'daily-chases', threshold: 1 },
    { collectibleId: 'journey-key', name: 'Journey key', taskId: 'journey-unlocks', threshold: 1 },
    { collectibleId: 'recap-ribbon', name: 'Recap ribbon', taskId: 'share-recaps', threshold: 1 }
  ],
  rewards: [
    { rewardId: 'starter-cache', title: 'Starter cache', threshold: 12, xp: 40, collectibleId: 'first-claim' },
    { rewardId: 'duel-cache', title: 'Duel cache', threshold: 48, xp: 80, collectibleId: 'duel-spark' },
    { rewardId: 'season-cache', title: 'Season cache', threshold: 120, xp: 160, collectibleId: 'journey-key' }
  ]
};

export function activeSeason(now = new Date()): SeasonDefinition | null {
  if (process.env.MATIMATO_SEASONAL_EVENTS_ENABLED === 'false' || process.env.NEXT_PUBLIC_MATIMATO_SEASONAL_EVENTS === 'false') return null;
  const time = now.getTime();
  if (time > new Date(DEFAULT_SEASON.claimUntil).getTime()) return null;
  return DEFAULT_SEASON;
}

export function createSeasonProgress(playerId: string, now = new Date()): SeasonProgress {
  return {
    seasonId: DEFAULT_SEASON.seasonId,
    playerId,
    taskProgress: {},
    collectedIds: [],
    rewardGrants: [],
    processedActionIds: [],
    updatedAt: now.toISOString()
  };
}

export function normalizeSeasonProgress(playerId: string, value: unknown, now = new Date()): SeasonProgress {
  if (!value || typeof value !== 'object') return createSeasonProgress(playerId, now);
  const raw = value as Partial<SeasonProgress>;
  if (raw.seasonId !== DEFAULT_SEASON.seasonId) return createSeasonProgress(playerId, now);
  return {
    seasonId: DEFAULT_SEASON.seasonId,
    playerId,
    taskProgress: normalizeTaskProgress(raw.taskProgress),
    collectedIds: Array.isArray(raw.collectedIds) ? raw.collectedIds.filter(isNonEmptyString) : [],
    rewardGrants: Array.isArray(raw.rewardGrants) ? raw.rewardGrants.filter(isRewardGrant) : [],
    processedActionIds: Array.isArray(raw.processedActionIds) ? raw.processedActionIds.filter(isNonEmptyString).slice(-120) : [],
    completedAt: typeof raw.completedAt === 'string' ? raw.completedAt : undefined,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now.toISOString()
  };
}

export function buildActiveSeasonState(playerId: string, rawProgress: unknown, now = new Date()): ActiveSeasonState | undefined {
  const definition = activeSeason(now);
  if (!definition) return undefined;
  const progress = syncSeasonProgress(definition, normalizeSeasonProgress(playerId, rawProgress, now), now);
  const points = seasonPoints(definition, progress);
  const complete = definition.collectibles.every((badge) => progress.collectedIds.includes(badge.collectibleId));
  const time = now.getTime();
  const status = time > new Date(definition.endsAt).getTime()
    ? time <= new Date(definition.claimUntil).getTime() ? 'claimable' : 'expired'
    : complete ? 'completed' : 'active';
  return {
    definition,
    progress,
    points,
    status,
    nextAction: nextSeasonAction(definition, progress)
  };
}

export function buildBadgeAlbum(state: ActiveSeasonState | undefined): BadgeAlbum | undefined {
  if (!state) return undefined;
  return {
    seasonId: state.definition.seasonId,
    badges: state.definition.collectibles.map((badge) => {
      const taskProgress = state.progress.taskProgress[badge.taskId] ?? 0;
      const unlocked = taskProgress >= badge.threshold;
      return { ...badge, state: state.progress.collectedIds.includes(badge.collectibleId) ? 'collected' : unlocked ? 'unlocked' : 'locked' };
    })
  };
}

export function applySeasonAction(rawProgress: unknown, input: SeasonActionInput, now = new Date()): SeasonProgress {
  const definition = activeSeason(now);
  const current = normalizeSeasonProgress(input.playerId, rawProgress, now);
  if (!definition) return current;
  const actionKey = `${input.source}:${input.metric}:${input.actionId}`;
  if (current.processedActionIds.includes(actionKey)) return current;
  let next: SeasonProgress = {
    ...current,
    processedActionIds: [...current.processedActionIds, actionKey].slice(-120),
    updatedAt: now.toISOString()
  };
  for (const task of definition.tasks) {
    if (task.source !== input.source || task.metric !== input.metric) continue;
    if (task.metric === 'score_threshold' && Number(input.score ?? 0) < task.target) continue;
    next = {
      ...next,
      taskProgress: { ...next.taskProgress, [task.taskId]: Math.min(task.target, (next.taskProgress[task.taskId] ?? 0) + 1) }
    };
  }
  return syncSeasonProgress(definition, next, now);
}

export function claimSeasonReward(rawProgress: unknown, playerId: string, rewardId: string, now = new Date()): SeasonClaimResult {
  const state = buildActiveSeasonState(playerId, rawProgress, now);
  if (!state) throw new Error('SEASON_UNAVAILABLE');
  if (state.status === 'expired') throw new Error('SEASON_CLAIM_EXPIRED');
  const reward = state.definition.rewards.find((item) => item.rewardId === rewardId);
  if (!reward) throw new Error('SEASON_REWARD_NOT_FOUND');
  if (state.points < reward.threshold) throw new Error('SEASON_REWARD_LOCKED');
  const existing = state.progress.rewardGrants.find((grant) => grant.rewardId === reward.rewardId);
  const claimedAt = now.toISOString();
  const grant: SeasonRewardGrant = existing
    ? { ...existing, claimedAt: existing.claimedAt ?? claimedAt }
    : {
        grantId: `${state.definition.seasonId}:${playerId}:${reward.rewardId}`,
        seasonId: state.definition.seasonId,
        rewardId: reward.rewardId,
        playerId,
        grantedAt: claimedAt,
        claimedAt
      };
  const progress: SeasonProgress = {
    ...state.progress,
    rewardGrants: [...state.progress.rewardGrants.filter((item) => item.rewardId !== reward.rewardId), grant],
    updatedAt: claimedAt
  };
  return {
    state: { ...state, progress },
    reward,
    grant,
    newlyClaimed: !existing?.claimedAt
  };
}

export function seasonPoints(definition: SeasonDefinition, progress: SeasonProgress): number {
  return definition.tasks.reduce((total, task) => total + Math.min(progress.taskProgress[task.taskId] ?? 0, task.target) * task.weight, 0);
}

function syncSeasonProgress(definition: SeasonDefinition, progress: SeasonProgress, now: Date): SeasonProgress {
  const collectedIds = new Set(progress.collectedIds);
  for (const collectible of definition.collectibles) {
    if ((progress.taskProgress[collectible.taskId] ?? 0) >= collectible.threshold) collectedIds.add(collectible.collectibleId);
  }
  const points = seasonPoints(definition, progress);
  const grants = [...progress.rewardGrants];
  for (const reward of definition.rewards) {
    if (points < reward.threshold || grants.some((grant) => grant.rewardId === reward.rewardId)) continue;
    grants.push({
      grantId: `${definition.seasonId}:${progress.playerId}:${reward.rewardId}`,
      seasonId: definition.seasonId,
      rewardId: reward.rewardId,
      playerId: progress.playerId,
      grantedAt: now.toISOString()
    });
  }
  const completed = definition.collectibles.every((badge) => collectedIds.has(badge.collectibleId));
  return {
    ...progress,
    collectedIds: [...collectedIds],
    rewardGrants: grants,
    completedAt: completed ? progress.completedAt ?? now.toISOString() : progress.completedAt
  };
}

function nextSeasonAction(definition: SeasonDefinition, progress: SeasonProgress): string {
  const next = definition.tasks.find((task) => (progress.taskProgress[task.taskId] ?? 0) < task.target);
  if (!next) return 'Season album complete. Claim any unlocked rewards.';
  if (next.source === 'journey') return 'Unlock the next board in Journey.';
  if (next.source === 'blitz') return 'Complete a Blitz sprint.';
  if (next.source === 'daily') return 'Finish today daily board.';
  if (next.source === 'recap') return 'Share a match recap.';
  return 'Finish a solo match.';
}

function normalizeTaskProgress(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, raw]) => [key, Math.max(0, Math.floor(Number(raw ?? 0))) || 0]));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isRewardGrant(value: unknown): value is SeasonRewardGrant {
  if (!value || typeof value !== 'object') return false;
  const raw = value as Partial<SeasonRewardGrant>;
  return isNonEmptyString(raw.grantId) && isNonEmptyString(raw.seasonId) && isNonEmptyString(raw.rewardId) && isNonEmptyString(raw.playerId) && isNonEmptyString(raw.grantedAt);
}

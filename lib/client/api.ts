import type { ActiveSeasonState, BoardProgression, BoardSize, GameApiResponse, GameMode, MatchSummary, OnboardingState, ProfileSummary, ProgressionResponse, RankEntry, SeasonReward, SeasonRewardGrant, SeasonTaskMetric, SeasonTaskSource, TelemetryEventName, TrainingChoice, TutorialStepId } from '@/lib/shared/types';

export const RETRY_POLICY = { maxAttempts: 3, baseDelayMs: 500, timeoutMs: 5000 } as const;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const retryable = !init?.method || init.method === 'GET';
  let lastError: unknown;
  for (let attempt = 1; attempt <= (retryable ? RETRY_POLICY.maxAttempts : 1); attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), RETRY_POLICY.timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal, headers: { 'content-type': 'application/json', ...(init?.headers || {}) } });
      const data = await parseResponse(response);
      if (!response.ok) throw new Error(data.error || 'Request failed');
      return data as T;
    } catch (error) {
      lastError = error;
      if (!retryable || attempt === RETRY_POLICY.maxAttempts || !isRetryableRequestError(error)) break;
      await delay(RETRY_POLICY.baseDelayMs * 2 ** (attempt - 1));
    } finally {
      window.clearTimeout(timeout);
    }
  }
  throw normalizeRequestError(lastError);
}

async function parseResponse(response: Response): Promise<{ error?: string } & Record<string, unknown>> {
  try {
    return await response.json();
  } catch {
    return { error: response.ok ? undefined : 'Request failed' };
  }
}

function isRetryableRequestError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof TypeError) return true;
  if (error instanceof Error && error.message.includes('NETWORK_OFFLINE')) return true;
  return false;
}

function normalizeRequestError(error: unknown): Error {
  if (error instanceof DOMException && error.name === 'AbortError') return new Error('Network timeout. Try again.');
  if (error instanceof Error) return error;
  return new Error('Request failed');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function offlineTelemetryName(state: 'offline' | 'recovered' | 'retry' | 'error'): TelemetryEventName {
  if (state === 'recovered') return 'ios_offline_recovered';
  if (state === 'retry') return 'ios_offline_retry';
  if (state === 'error') return 'ios_wrapper_error';
  return 'ios_offline_state_changed';
}

export function getPlayerId(): string {
  const key = 'matimato.playerId';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export function getPlayerTag(): string {
  return localStorage.getItem('matimato.playerTag') || '';
}

export function setPlayerTag(tag: string): void {
  localStorage.setItem('matimato.playerTag', tag.trim());
}

export function clearPlayerSession(playerId?: string): void {
  localStorage.removeItem('matimato.playerId');
  localStorage.removeItem('matimato.playerTag');
  if (playerId) localStorage.removeItem(`matimato.onboarding.${playerId}`);
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith('matimato.onboarding.')) localStorage.removeItem(key);
  }
}

export function getLocalOnboarding(playerId: string): OnboardingState | null {
  const raw = localStorage.getItem(`matimato.onboarding.${playerId}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    return {
      playerId,
      completedAt: typeof parsed.completedAt === 'string' ? parsed.completedAt : undefined,
      lastStep: parsed.lastStep,
      dismissedAt: typeof parsed.dismissedAt === 'string' ? parsed.dismissedAt : undefined,
      trainingChoice: parsed.trainingChoice,
      trainingChoiceAt: typeof parsed.trainingChoiceAt === 'string' ? parsed.trainingChoiceAt : undefined,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date(0).toISOString()
    };
  } catch {
    localStorage.removeItem(`matimato.onboarding.${playerId}`);
    return null;
  }
}

export function setLocalOnboarding(onboarding: OnboardingState): void {
  localStorage.setItem(`matimato.onboarding.${onboarding.playerId}`, JSON.stringify(onboarding));
}

export function createGame(mode: GameMode, playerId: string, playerTag: string, options?: { lobbyVersion?: 2; dailyId?: string; boardSize?: BoardSize; botProfileId?: string; clock?: { turnLimitMs?: number } }): Promise<GameApiResponse> {
  return request('/api/games', { method: 'POST', body: JSON.stringify({ type: 'create', mode, playerId, playerTag, ...options }) });
}

export function joinGame(inviteCode: string, playerId: string, playerTag: string): Promise<GameApiResponse> {
  return request('/api/games', { method: 'POST', body: JSON.stringify({ type: 'join', inviteCode, playerId, playerTag }) });
}

export function fetchGame(matchId: string): Promise<GameApiResponse> {
  return request(`/api/games?id=${encodeURIComponent(matchId)}`);
}

export function requestTimeout(matchId: string, playerId: string, deadlineVersion: number): Promise<GameApiResponse> {
  return request('/api/games', { method: 'POST', body: JSON.stringify({ type: 'timeout', matchId, playerId, deadlineVersion }) });
}

export function fetchLobby(matchId: string, playerId: string): Promise<GameApiResponse> {
  return request('/api/games', { method: 'POST', body: JSON.stringify({ type: 'lobbyStatus', matchId, playerId }) });
}

export function readyLobby(matchId: string, playerId: string): Promise<GameApiResponse> {
  return request('/api/games', { method: 'POST', body: JSON.stringify({ type: 'ready', matchId, playerId, actionId: crypto.randomUUID() }) });
}

export function leaveLobby(matchId: string, playerId: string): Promise<GameApiResponse> {
  return request('/api/games', { method: 'POST', body: JSON.stringify({ type: 'leave', matchId, playerId, actionId: crypto.randomUUID() }) });
}

export function cancelLobby(matchId: string, playerId: string): Promise<GameApiResponse> {
  return request('/api/games', { method: 'POST', body: JSON.stringify({ type: 'cancel', matchId, playerId, actionId: crypto.randomUUID() }) });
}

export function fetchProfile(playerId: string, tag: string): Promise<{ profile: ProfileSummary }> {
  return request(`/api/profile?playerId=${encodeURIComponent(playerId)}&tag=${encodeURIComponent(tag)}`);
}

export function fetchHistory(playerId: string): Promise<{ history: MatchSummary[] }> {
  return request(`/api/history?playerId=${encodeURIComponent(playerId)}`);
}

export function fetchLeaderboard(): Promise<{ leaderboard: RankEntry[] }> {
  return request('/api/leaderboard');
}

export function fetchProgression(playerId?: string): Promise<ProgressionResponse> {
  const suffix = playerId ? `?playerId=${encodeURIComponent(playerId)}` : '';
  return request(`/api/progression${suffix}`);
}

export function persistOnboarding(playerId: string, input: { step?: TutorialStepId; completed?: boolean; dismissed?: boolean; trainingChoice?: TrainingChoice }): Promise<{ ok: true; onboarding: OnboardingState }> {
  return request('/api/progression', { method: 'POST', body: JSON.stringify({ type: 'onboarding', playerId, ...input }) });
}

export function purchaseBoardSize(playerId: string, boardSize: BoardSize, actionId = crypto.randomUUID()): Promise<{ ok: true; progression: BoardProgression }> {
  return request('/api/progression', { method: 'POST', body: JSON.stringify({ type: 'purchaseBoard', playerId, boardSize, actionId }) });
}

export function selectBoardSize(playerId: string, boardSize: BoardSize): Promise<{ ok: true; progression: BoardProgression }> {
  return request('/api/progression', { method: 'POST', body: JSON.stringify({ type: 'selectBoard', playerId, boardSize }) });
}

export function recordSeasonAction(input: { playerId: string; source: SeasonTaskSource; metric: SeasonTaskMetric; actionId: string; score?: number; boardSize?: BoardSize }): Promise<{ ok: true; activeSeason?: ActiveSeasonState }> {
  return request('/api/progression', { method: 'POST', body: JSON.stringify({ type: 'seasonAction', ...input }) });
}

export function claimSeasonReward(playerId: string, rewardId: string): Promise<{ ok: true; claimed: boolean; reward: SeasonReward; grant: SeasonRewardGrant; profileDelta: { xp: number; spendableXp: number }; activeSeason: ActiveSeasonState; progression: BoardProgression }> {
  return request('/api/progression', { method: 'POST', body: JSON.stringify({ type: 'claimSeasonReward', playerId, rewardId }) });
}

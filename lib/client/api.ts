import type { GameApiResponse, GameMode, MatchSummary, OnboardingState, ProfileSummary, ProgressionResponse, RankEntry, TutorialStepId } from '@/lib/shared/types';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { 'content-type': 'application/json', ...(init?.headers || {}) } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data as T;
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

export function getLocalOnboarding(playerId: string): OnboardingState | null {
  const raw = localStorage.getItem(`matimato.onboarding.${playerId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OnboardingState;
  } catch {
    localStorage.removeItem(`matimato.onboarding.${playerId}`);
    return null;
  }
}

export function setLocalOnboarding(onboarding: OnboardingState): void {
  localStorage.setItem(`matimato.onboarding.${onboarding.playerId}`, JSON.stringify(onboarding));
}

export function createGame(mode: GameMode, playerId: string, playerTag: string, options?: { lobbyVersion?: 2; dailyId?: string }): Promise<GameApiResponse> {
  return request('/api/games', { method: 'POST', body: JSON.stringify({ type: 'create', mode, playerId, playerTag, ...options }) });
}

export function joinGame(inviteCode: string, playerId: string, playerTag: string): Promise<GameApiResponse> {
  return request('/api/games', { method: 'POST', body: JSON.stringify({ type: 'join', inviteCode, playerId, playerTag }) });
}

export function fetchGame(matchId: string): Promise<GameApiResponse> {
  return request(`/api/games?id=${encodeURIComponent(matchId)}`);
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

export function persistOnboarding(playerId: string, input: { step?: TutorialStepId; completed?: boolean; dismissed?: boolean }): Promise<{ ok: true; onboarding: OnboardingState }> {
  return request('/api/progression', { method: 'POST', body: JSON.stringify({ type: 'onboarding', playerId, ...input }) });
}

import type { GameApiResponse, GameMode, MatchSummary, ProfileSummary, RankEntry } from '@/lib/shared/types';

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

export function createGame(mode: GameMode, playerId: string, playerTag: string): Promise<GameApiResponse> {
  return request('/api/games', { method: 'POST', body: JSON.stringify({ type: 'create', mode, playerId, playerTag }) });
}

export function joinGame(inviteCode: string, playerId: string, playerTag: string): Promise<GameApiResponse> {
  return request('/api/games', { method: 'POST', body: JSON.stringify({ type: 'join', inviteCode, playerId, playerTag }) });
}

export function fetchGame(matchId: string): Promise<GameApiResponse> {
  return request(`/api/games?id=${encodeURIComponent(matchId)}`);
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

export function fetchProgression(): Promise<{ daily: { id: string; title: string; board: string; status: string }; quests: Array<{ id: string; title: string; progress: number; target: number; rewardXp: number }> }> {
  return request('/api/progression');
}

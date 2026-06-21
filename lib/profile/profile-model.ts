import crypto from "node:crypto";
import type { MatchSummary } from "@/lib/game/match-summary";
import type { Profile, ProfileStats } from "./types";

const AVATAR_COLORS = ["#ff6b3d", "#f43f8f", "#f59e0b", "#06b6d4", "#84cc16", "#a855f7"] as const;

export function normalizeDisplayTag(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ").slice(0, 24);
  if (!normalized) return "Player";
  return normalized.replace(/[^\p{L}\p{N} _.-]/gu, "");
}

export function createProfile(input: { id: string; tokenHash: string; displayTag?: string; now?: Date }): Profile {
  const now = (input.now ?? new Date()).toISOString();
  return {
    id: input.id,
    tokenHash: input.tokenHash,
    displayTag: normalizeDisplayTag(input.displayTag || `Player ${input.id.slice(0, 4).toUpperCase()}`),
    avatarColor: avatarColorForId(input.id),
    createdAt: now,
    lastActiveAt: now,
    stats: emptyStats(),
    xp: 0,
    level: 1,
    appliedSummaryIds: []
  };
}

export function touchProfile(profile: Profile, now = new Date()): Profile {
  return { ...profile, lastActiveAt: now.toISOString() };
}

export function updateProfileIdentity(profile: Profile, input: { displayTag?: string; avatarColor?: string; now?: Date }): Profile {
  const avatarColor = input.avatarColor && isAvatarColor(input.avatarColor) ? input.avatarColor : profile.avatarColor;
  return {
    ...profile,
    displayTag: input.displayTag === undefined ? profile.displayTag : normalizeDisplayTag(input.displayTag),
    avatarColor,
    lastActiveAt: (input.now ?? new Date()).toISOString()
  };
}

export function applySummaryToProfile(profile: Profile, summary: MatchSummary): Profile {
  if (profile.appliedSummaryIds.includes(summary.gameId)) return profile;
  const participant = summary.participants.find((item) => item.profileId === profile.id);
  if (!participant) return profile;
  const won = summary.winnerPlayerId === participant.playerId;
  const draw = summary.draw;
  const stats: ProfileStats = {
    matches: profile.stats.matches + 1,
    wins: profile.stats.wins + (won ? 1 : 0),
    losses: profile.stats.losses + (!won && !draw ? 1 : 0),
    draws: profile.stats.draws + (draw ? 1 : 0),
    bestScore: Math.max(profile.stats.bestScore, participant.score),
    currentStreak: won ? profile.stats.currentStreak + 1 : draw ? profile.stats.currentStreak : 0
  };
  const xp = profile.xp + 20 + (won ? 30 : draw ? 10 : 0);
  return {
    ...profile,
    stats,
    xp,
    level: Math.floor(xp / 100) + 1,
    lastActiveAt: summary.completedAt,
    appliedSummaryIds: [...profile.appliedSummaryIds, summary.gameId]
  };
}

export function avatarColors() {
  return [...AVATAR_COLORS];
}

function emptyStats(): ProfileStats {
  return { matches: 0, wins: 0, losses: 0, draws: 0, bestScore: 0, currentStreak: 0 };
}

function avatarColorForId(id: string) {
  const digest = crypto.createHash("sha256").update(id).digest();
  return AVATAR_COLORS[digest[0] % AVATAR_COLORS.length];
}

function isAvatarColor(value: string): value is typeof AVATAR_COLORS[number] {
  return AVATAR_COLORS.includes(value as typeof AVATAR_COLORS[number]);
}

export type ProfileStats = {
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  bestScore: number;
  currentStreak: number;
};

export type Profile = {
  id: string;
  tokenHash: string;
  displayTag: string;
  avatarColor: string;
  createdAt: string;
  lastActiveAt: string;
  stats: ProfileStats;
  xp: number;
  level: number;
  appliedSummaryIds: string[];
};

export type PublicProfile = Omit<Profile, "tokenHash" | "appliedSummaryIds">;

export function toPublicProfile(profile: Profile): PublicProfile {
  return {
    id: profile.id,
    displayTag: profile.displayTag,
    avatarColor: profile.avatarColor,
    createdAt: profile.createdAt,
    lastActiveAt: profile.lastActiveAt,
    stats: profile.stats,
    xp: profile.xp,
    level: profile.level
  };
}

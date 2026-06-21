export type ProfileStats = {
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  bestScore: number;
  currentStreak: number;
};

export type MissionProgress = {
  profileId: string;
  missionId: string;
  period: string;
  title: string;
  progress: number;
  target: number;
  completedAt?: string;
  claimedAt?: string;
};

export type BadgeAward = {
  profileId: string;
  badgeId: string;
  sourceId: string;
  awardedAt: string;
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
  missions: MissionProgress[];
  badges: BadgeAward[];
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
    level: profile.level,
    missions: profile.missions,
    badges: profile.badges
  };
}

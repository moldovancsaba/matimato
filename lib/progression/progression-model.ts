import type { MatchSummary, MatchSummaryParticipant } from "@/lib/game/match-summary";
import type { BadgeAward, MissionProgress, Profile } from "@/lib/profile/types";

export function xpForSummary(summary: MatchSummary, participant: MatchSummaryParticipant, dailyBonus: number) {
  const rival = summary.participants.find((item) => item.playerId !== participant.playerId);
  const scoreDelta = Math.abs(participant.score - (rival?.score ?? 0));
  const won = summary.winnerPlayerId === participant.playerId;
  return 25 + (won ? 50 : 0) + (summary.draw ? 10 : 0) + Math.min(50, scoreDelta * 2) + dailyBonus;
}

export function levelForXp(totalXp: number) {
  return Math.floor(Math.sqrt(totalXp / 100)) + 1;
}

export function applyProgression(profile: Profile, summary: MatchSummary, participant: MatchSummaryParticipant): Profile {
  const period = summary.completedAt.slice(0, 10);
  const existingDaily = profile.missions.some((mission) => mission.period === period && mission.missionId === "daily-finish");
  const dailyBonus = existingDaily ? 0 : 25;
  const won = summary.winnerPlayerId === participant.playerId;
  const xp = profile.xp + xpForSummary(summary, participant, dailyBonus);
  const missions = updateMissions(profile.missions, summary, participant, period);
  const badges = awardBadges(profile, summary, won);

  return {
    ...profile,
    xp,
    level: levelForXp(xp),
    missions,
    badges
  };
}

function updateMissions(missions: MissionProgress[], summary: MatchSummary, participant: MatchSummaryParticipant, period: string) {
  const won = summary.winnerPlayerId === participant.playerId;
  return [
    upsertMission(missions, {
      profileId: participant.profileId!,
      missionId: "daily-finish",
      period,
      title: "Finish one match",
      progress: 1,
      target: 1,
      completedAt: summary.completedAt
    }),
    upsertMission(missions, {
      profileId: participant.profileId!,
      missionId: "daily-score-25",
      period,
      title: "Score 25 points",
      progress: Math.max(0, participant.score),
      target: 25,
      completedAt: participant.score >= 25 ? summary.completedAt : undefined
    }),
    ...(summary.mode === "pvp" ? [upsertMission(missions, {
      profileId: participant.profileId!,
      missionId: "daily-battle-win",
      period,
      title: "Win a battle",
      progress: won ? 1 : 0,
      target: 1,
      completedAt: won ? summary.completedAt : undefined
    })] : [])
  ];
}

function upsertMission(existing: MissionProgress[], next: MissionProgress) {
  const current = existing.find((mission) => mission.missionId === next.missionId && mission.period === next.period);
  if (!current) return next;
  return {
    ...current,
    progress: Math.min(next.target, Math.max(current.progress, next.progress)),
    completedAt: current.completedAt ?? next.completedAt
  };
}

function awardBadges(profile: Profile, summary: MatchSummary, won: boolean) {
  const badges = [...profile.badges];
  pushBadge(badges, profile.id, "first-match", summary.gameId, summary.completedAt);
  if (won) pushBadge(badges, profile.id, "first-win", summary.gameId, summary.completedAt);
  if (profile.stats.currentStreak >= 3) pushBadge(badges, profile.id, "hot-streak", summary.gameId, summary.completedAt);
  return badges;
}

function pushBadge(badges: BadgeAward[], profileId: string, badgeId: string, sourceId: string, awardedAt: string) {
  if (badges.some((badge) => badge.badgeId === badgeId)) return;
  badges.push({ profileId, badgeId, sourceId, awardedAt });
}

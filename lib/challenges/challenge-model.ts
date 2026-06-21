import crypto from "node:crypto";
import { generateSignedBoard } from "@/lib/game/engine";
import type { MatchSummary } from "@/lib/game/match-summary";

export type DailyChallenge = {
  date: string;
  seed: string;
  boardHash: string;
  status: "active" | "disabled";
  createdAt: string;
};

export type ChallengeAttempt = {
  rank: number;
  challengeDate: string;
  profileId: string;
  displayTag: string;
  score: number;
  durationMs: number;
  completedAt: string;
  shareToken: string;
};

export function todayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function dailyChallenge(date = todayKey()): DailyChallenge {
  const board = challengeBoard(date);
  return {
    date,
    seed: stableSeed(date),
    boardHash: hashBoard(board),
    status: "active",
    createdAt: `${date}T00:00:00.000Z`
  };
}

export function challengeBoard(date: string) {
  const rng = seededRng(stableSeed(date));
  return generateSignedBoard(9, 9, 0.58, rng);
}

export function rankChallengeAttempts(summaries: MatchSummary[], date: string): ChallengeAttempt[] {
  return summaries
    .filter((summary) => summary.challengeDate === date)
    .flatMap((summary) => summary.participants.filter((participant) => participant.profileId).map((participant) => ({
      challengeDate: date,
      profileId: participant.profileId!,
      displayTag: participant.displayName,
      score: participant.score,
      durationMs: summary.durationMs,
      completedAt: summary.completedAt,
      shareToken: shareToken(summary.gameId, participant.profileId!)
    })))
    .sort((a, b) => b.score - a.score || a.durationMs - b.durationMs || a.completedAt.localeCompare(b.completedAt))
    .map((attempt, index) => ({ ...attempt, rank: index + 1 }));
}

function stableSeed(date: string) {
  return crypto.createHash("sha256").update(`matimato-daily-${date}`).digest("hex").slice(0, 16);
}

function hashBoard(board: number[][]) {
  return crypto.createHash("sha256").update(JSON.stringify(board)).digest("hex");
}

function shareToken(gameId: string, profileId: string) {
  return crypto.createHash("sha256").update(`${gameId}:${profileId}`).digest("base64url").slice(0, 16);
}

function seededRng(seed: string) {
  let state = Number.parseInt(seed.slice(0, 8), 16) || 1;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

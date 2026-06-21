import type { MatchSummary } from "@/lib/game/match-summary";

export type HistoryModeFilter = "all" | "solo" | "battle";

export type HistoryItem = {
  gameId: string;
  mode: "SOLO" | "BATTLE";
  result: "win" | "loss" | "draw";
  playerScore: number;
  rivalScore?: number;
  rivalName?: string;
  completedAt: string;
  durationMs: number;
};

export function toHistoryItemForProfile(summary: MatchSummary, profileId: string): HistoryItem | null {
  const participant = summary.participants.find((item) => item.profileId === profileId);
  if (!participant) return null;
  const rival = summary.participants.find((item) => item.profileId !== profileId || item.playerId !== participant.playerId);
  const result = summary.draw ? "draw" : summary.winnerPlayerId === participant.playerId ? "win" : "loss";
  return {
    gameId: summary.gameId,
    mode: summary.mode === "ai" ? "SOLO" : "BATTLE",
    result,
    playerScore: participant.score,
    rivalScore: rival?.score,
    rivalName: rival?.displayName,
    completedAt: summary.completedAt,
    durationMs: summary.durationMs
  };
}

export function modeFilterToSummaryMode(mode: HistoryModeFilter): "ai" | "pvp" | undefined {
  if (mode === "solo") return "ai";
  if (mode === "battle") return "pvp";
  return undefined;
}

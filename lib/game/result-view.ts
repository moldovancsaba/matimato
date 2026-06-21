import type { PublicGameDto } from "@/lib/game/types";

export type ResultOutcome = "victory" | "defeat" | "draw" | "closed" | "spectator";

export type ResultView = {
  outcome: ResultOutcome;
  title: string;
  headline: string;
  shareText: string;
};

export function toResultView(game: Pick<PublicGameDto, "status" | "terminal" | "viewer" | "winnerPlayerId" | "players">): ResultView {
  const scoreLine = game.players.map((player) => `${player.displayName} ${player.score}`).join(" / ");

  if (game.status === "abandoned") {
    return {
      outcome: "closed",
      title: "Lobby closed",
      headline: "This invite is no longer active.",
      shareText: "Matimato battle lobby closed."
    };
  }

  if (game.status === "expired") {
    return {
      outcome: "closed",
      title: "Battle expired",
      headline: "Start a fresh battle.",
      shareText: "Matimato battle expired."
    };
  }

  if (game.terminal?.draw) {
    return {
      outcome: "draw",
      title: "Draw",
      headline: "Both sides held the grid.",
      shareText: `Matimato draw on the 9x9 grid: ${scoreLine}.`
    };
  }

  if (!game.viewer) {
    return {
      outcome: "spectator",
      title: "Match over",
      headline: "The board is closed.",
      shareText: `Matimato match over: ${scoreLine}.`
    };
  }

  const victory = game.winnerPlayerId === game.viewer.playerId;
  return {
    outcome: victory ? "victory" : "defeat",
    title: victory ? "Victory" : "Defeat",
    headline: victory ? "You owned the grid." : "Your rival took the grid.",
    shareText: `Matimato ${victory ? "victory" : "battle"} on the 9x9 grid: ${scoreLine}.`
  };
}

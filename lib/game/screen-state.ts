import type { PublicGameDto } from "@/lib/game/types";

export type AppDestination = "home" | "battle" | "challenges" | "leaderboard" | "history" | "profile";
export type SetupScreen = "home" | "setup" | "challenges" | "leaderboard" | "history" | "profile";
export type GameScreen = SetupScreen | "battleLobby" | "match" | "result";

export function resolveScreen(game: Pick<PublicGameDto, "mode" | "status"> | null, setupScreen: SetupScreen): GameScreen {
  if (!game) return setupScreen;
  if (game.status === "finished" || game.status === "expired" || game.status === "abandoned") return "result";
  if (game.status === "waiting" && game.mode === "pvp") return "battleLobby";
  return "match";
}

export function destinationToScreen(destination: AppDestination): SetupScreen {
  if (destination === "battle") return "setup";
  return destination;
}

export function screenToDestination(screen: GameScreen): AppDestination | null {
  if (screen === "match") return null;
  if (screen === "battleLobby" || screen === "setup") return "battle";
  if (screen === "result") return "home";
  return screen;
}

export function shouldShowAppNav(screen: GameScreen): boolean {
  return screen !== "match";
}

import type { PublicGameDto } from "@/lib/game/types";

export type SetupScreen = "home" | "setup";
export type GameScreen = SetupScreen | "battleLobby" | "match" | "result";

export function resolveScreen(game: Pick<PublicGameDto, "mode" | "status"> | null, setupScreen: SetupScreen): GameScreen {
  if (!game) return setupScreen;
  if (game.status === "finished" || game.status === "expired" || game.status === "abandoned") return "result";
  if (game.status === "waiting" && game.mode === "pvp") return "battleLobby";
  return "match";
}

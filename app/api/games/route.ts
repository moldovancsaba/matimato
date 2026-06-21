import { NextRequest } from "next/server";
import { z } from "zod";
import { createGameForMode } from "@/lib/server/game-service";
import { errorResponse, successResponse } from "@/lib/server/http";
import { assertRateLimit } from "@/lib/server/rate-limit";
import { getCredentialCookieName } from "@/lib/server/session";

const createSchema = z.object({
  mode: z.enum(["ai", "pvp"]),
  boardSize: z.literal(9).default(9),
  difficulty: z.enum(["basic", "standard", "hard"]).default("standard"),
  displayName: z.string().trim().min(1).max(40).default("Player 1")
});

export async function POST(request: NextRequest) {
  try {
    assertRateLimit(request, { route: "/api/games", limit: 20, windowMs: 60_000 });
    const body = createSchema.parse(await request.json());
    const result = await createGameForMode(body);
    return successResponse(
      { game: result.game },
      {
        status: 201,
        credential: result.credential,
        gameId: result.game.id,
        existingCredentialCookie: request.cookies.get(getCredentialCookieName())?.value
      }
    );
  } catch (error) {
    return errorResponse(error, { route: "/api/games", request });
  }
}

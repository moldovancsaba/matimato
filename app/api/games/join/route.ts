import { NextRequest } from "next/server";
import { z } from "zod";
import { joinGameByCode } from "@/lib/server/game-service";
import { errorResponse, successResponse } from "@/lib/server/http";
import { resolveProfile } from "@/lib/server/profile-service";
import { assertRateLimit } from "@/lib/server/rate-limit";
import { getCredentialCookieName } from "@/lib/server/session";

const joinSchema = z.object({
  code: z.string().trim().min(4).max(16),
  displayName: z.string().trim().min(1).max(40).default("Player 2")
});

export async function POST(request: NextRequest) {
  try {
    assertRateLimit(request, { route: "/api/games/join", limit: 30, windowMs: 60_000 });
    const body = joinSchema.parse(await request.json());
    const profile = await resolveProfile(request, body.displayName);
    const result = await joinGameByCode({ ...body, profileId: profile.profileId });
    return successResponse(
      { game: result.game },
      {
        credential: result.credential,
        gameId: result.game.id,
        existingCredentialCookie: request.cookies.get(getCredentialCookieName())?.value,
        profileCredential: profile.credential
      }
    );
  } catch (error) {
    return errorResponse(error, { route: "/api/games/join", request });
  }
}

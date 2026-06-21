import { NextRequest } from "next/server";
import { z } from "zod";
import { createChallengeGame } from "@/lib/server/game-service";
import { errorResponse, successResponse } from "@/lib/server/http";
import { resolveProfile } from "@/lib/server/profile-service";
import { assertRateLimit } from "@/lib/server/rate-limit";
import { getCredentialCookieName } from "@/lib/server/session";

const paramsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  try {
    assertRateLimit(request, { route: "/api/challenges/[date]/start", limit: 20, windowMs: 60_000 });
    const { date } = paramsSchema.parse(await params);
    const profile = await resolveProfile(request);
    const result = await createChallengeGame({ date, displayName: profile.profile.displayTag, profileId: profile.profileId });
    return successResponse({ game: result.game }, {
      status: 201,
      credential: result.credential,
      gameId: result.game.id,
      existingCredentialCookie: request.cookies.get(getCredentialCookieName())?.value,
      profileCredential: profile.credential
    });
  } catch (error) {
    return errorResponse(error, { route: "/api/challenges/[date]/start", request });
  }
}

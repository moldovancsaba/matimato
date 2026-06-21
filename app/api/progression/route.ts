import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/server/http";
import { resolveProfile } from "@/lib/server/profile-service";
import { assertFeatureEnabled } from "@/lib/server/ops";
import { assertRateLimit } from "@/lib/server/rate-limit";

export async function GET(request: NextRequest) {
  try {
    assertRateLimit(request, { route: "/api/progression", limit: 60, windowMs: 60_000 });
    assertFeatureEnabled("gamification");
    const result = await resolveProfile(request);
    return successResponse({
      xp: result.profile.xp,
      level: result.profile.level,
      streak: result.profile.stats.currentStreak,
      missions: result.profile.missions,
      badges: result.profile.badges
    }, { profileCredential: result.credential });
  } catch (error) {
    return errorResponse(error, { route: "/api/progression", request });
  }
}

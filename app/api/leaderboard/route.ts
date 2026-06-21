import { NextRequest } from "next/server";
import { z } from "zod";
import { buildLeaderboard, leaderboardModeToSummaryMode, weeklyStart } from "@/lib/leaderboard/leaderboard-model";
import { errorResponse, successResponse } from "@/lib/server/http";
import { resolveProfile } from "@/lib/server/profile-service";
import { assertFeatureEnabled } from "@/lib/server/ops";
import { assertRateLimit } from "@/lib/server/rate-limit";
import { getGameStore } from "@/lib/server/store";

const querySchema = z.object({
  period: z.enum(["weekly", "all_time"]).default("weekly"),
  mode: z.enum(["solo", "battle"]).default("battle")
});

export async function GET(request: NextRequest) {
  try {
    assertRateLimit(request, { route: "/api/leaderboard", limit: 60, windowMs: 60_000 });
    assertFeatureEnabled("leaderboards");
    const query = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const profile = await resolveProfile(request);
    const summaries = await getGameStore().listMatchSummariesForLeaderboard({
      mode: leaderboardModeToSummaryMode(query.mode),
      completedAfter: query.period === "weekly" ? weeklyStart() : undefined,
      limit: 500
    });
    const leaderboard = buildLeaderboard({
      summaries,
      mode: query.mode,
      currentProfileId: profile.profileId,
      limit: 20
    });
    return successResponse({
      period: query.period,
      mode: query.mode,
      entries: leaderboard.entries,
      currentEntry: leaderboard.currentEntry,
      updatedAt: new Date().toISOString()
    }, { profileCredential: profile.credential });
  } catch (error) {
    return errorResponse(error, { route: "/api/leaderboard", request });
  }
}

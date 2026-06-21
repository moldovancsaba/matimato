import { NextRequest } from "next/server";
import { z } from "zod";
import { modeFilterToSummaryMode, toHistoryItemForProfile } from "@/lib/history/history-model";
import { errorResponse, successResponse } from "@/lib/server/http";
import { resolveProfile } from "@/lib/server/profile-service";
import { assertFeatureEnabled } from "@/lib/server/ops";
import { assertRateLimit } from "@/lib/server/rate-limit";
import { getGameStore } from "@/lib/server/store";

const querySchema = z.object({
  mode: z.enum(["all", "solo", "battle"]).default("all"),
  cursor: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(20)
});

export async function GET(request: NextRequest) {
  try {
    assertRateLimit(request, { route: "/api/history", limit: 60, windowMs: 60_000 });
    assertFeatureEnabled("history");
    const query = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const profile = await resolveProfile(request);
    const result = await getGameStore().listMatchSummariesByProfile({
      profileId: profile.profileId,
      mode: modeFilterToSummaryMode(query.mode),
      cursor: query.cursor,
      limit: query.limit
    });
    return successResponse({
      items: result.summaries.map((summary) => toHistoryItemForProfile(summary, profile.profileId)).filter(Boolean),
      nextCursor: result.nextCursor
    }, { profileCredential: profile.credential });
  } catch (error) {
    return errorResponse(error, { route: "/api/history", request });
  }
}

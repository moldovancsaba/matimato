import { NextRequest } from "next/server";
import { z } from "zod";
import { rankChallengeAttempts } from "@/lib/challenges/challenge-model";
import { errorResponse, successResponse } from "@/lib/server/http";
import { assertRateLimit } from "@/lib/server/rate-limit";
import { getGameStore } from "@/lib/server/store";

const paramsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  try {
    assertRateLimit(request, { route: "/api/challenges/[date]/leaderboard", limit: 60, windowMs: 60_000 });
    const { date } = paramsSchema.parse(await params);
    const summaries = await getGameStore().listChallengeSummaries({ date, limit: 200 });
    return successResponse({ attempts: rankChallengeAttempts(summaries, date).slice(0, 50) });
  } catch (error) {
    return errorResponse(error, { route: "/api/challenges/[date]/leaderboard", request });
  }
}

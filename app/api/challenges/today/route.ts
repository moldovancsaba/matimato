import { NextRequest } from "next/server";
import { dailyChallenge, rankChallengeAttempts, todayKey } from "@/lib/challenges/challenge-model";
import { errorResponse, successResponse } from "@/lib/server/http";
import { resolveProfile } from "@/lib/server/profile-service";
import { assertRateLimit } from "@/lib/server/rate-limit";
import { getGameStore } from "@/lib/server/store";

export async function GET(request: NextRequest) {
  try {
    assertRateLimit(request, { route: "/api/challenges/today", limit: 60, windowMs: 60_000 });
    const profile = await resolveProfile(request);
    const challenge = dailyChallenge(todayKey());
    const summaries = await getGameStore().listChallengeSummaries({ date: challenge.date, limit: 100 });
    const attempts = rankChallengeAttempts(summaries, challenge.date);
    return successResponse({
      challenge,
      attempts: attempts.slice(0, 10),
      currentAttempt: attempts.find((attempt) => attempt.profileId === profile.profileId) ?? null
    }, { profileCredential: profile.credential });
  } catch (error) {
    return errorResponse(error, { route: "/api/challenges/today", request });
  }
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, successResponse } from "@/lib/server/http";
import { resolveProfile, updateCurrentProfile } from "@/lib/server/profile-service";
import { assertRateLimit } from "@/lib/server/rate-limit";

const updateSchema = z.object({
  displayTag: z.string().trim().min(1).max(24).optional(),
  avatarColor: z.string().trim().min(4).max(16).optional()
});

export async function GET(request: NextRequest) {
  try {
    assertRateLimit(request, { route: "/api/profile", limit: 60, windowMs: 60_000 });
    const result = await resolveProfile(request);
    return successResponse({ profile: result.profile }, { profileCredential: result.credential });
  } catch (error) {
    return errorResponse(error, { route: "/api/profile", request });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    assertRateLimit(request, { route: "/api/profile", limit: 20, windowMs: 60_000 });
    const result = await updateCurrentProfile(request, updateSchema.parse(await request.json()));
    return successResponse({ profile: result.profile }, { profileCredential: result.credential });
  } catch (error) {
    return errorResponse(error, { route: "/api/profile", request });
  }
}

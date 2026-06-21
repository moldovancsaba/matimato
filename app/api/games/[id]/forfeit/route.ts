import { NextRequest } from "next/server";
import { forfeitGame } from "@/lib/server/game-service";
import { errorResponse, successResponse } from "@/lib/server/http";
import { getCredentialFromRequest } from "@/lib/server/session";
import { assertRateLimit } from "@/lib/server/rate-limit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    assertRateLimit(request, { route: "/api/games/[id]/forfeit", limit: 10, windowMs: 60_000 });
    const result = await forfeitGame(id, getCredentialFromRequest(request, id));
    return successResponse(result);
  } catch (error) {
    return errorResponse(error, { route: "/api/games/[id]/forfeit", request });
  }
}

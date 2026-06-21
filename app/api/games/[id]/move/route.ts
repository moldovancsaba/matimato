import { NextRequest } from "next/server";
import { z } from "zod";
import { applyViewerMove } from "@/lib/server/game-service";
import { errorResponse, successResponse } from "@/lib/server/http";
import { getCredentialFromRequest } from "@/lib/server/session";
import { assertRateLimit } from "@/lib/server/rate-limit";

const moveSchema = z.object({
  viewRow: z.number().int().min(0),
  viewCol: z.number().int().min(0),
  version: z.number().int().min(0)
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    assertRateLimit(request, { route: "/api/games/[id]/move", limit: 60, windowMs: 60_000 });
    const credential = getCredentialFromRequest(request, id);
    const result = await applyViewerMove(id, credential, moveSchema.parse(await request.json()));
    return successResponse(result);
  } catch (error) {
    return errorResponse(error, { route: "/api/games/[id]/move", request });
  }
}

import { NextRequest } from "next/server";
import { getGameForViewer } from "@/lib/server/game-service";
import { errorResponse, successResponse } from "@/lib/server/http";
import { getCredentialFromRequest } from "@/lib/server/session";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const credential = getCredentialFromRequest(request, id);
    const result = await getGameForViewer(id, credential);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error, { route: "/api/games/[id]", request });
  }
}

import { NextRequest } from "next/server";
import { forfeitGame } from "@/lib/server/game-service";
import { errorResponse, successResponse } from "@/lib/server/http";
import { getCredentialFromRequest } from "@/lib/server/session";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await forfeitGame(id, getCredentialFromRequest(request));
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { joinGameByCode } from "@/lib/server/game-service";
import { errorResponse, successResponse } from "@/lib/server/http";

const joinSchema = z.object({
  code: z.string().trim().min(4).max(16),
  displayName: z.string().trim().min(1).max(40).default("Player 2")
});

export async function POST(request: NextRequest) {
  try {
    const result = await joinGameByCode(joinSchema.parse(await request.json()));
    return successResponse({ game: result.game }, { credential: result.credential });
  } catch (error) {
    return errorResponse(error);
  }
}

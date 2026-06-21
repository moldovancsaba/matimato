import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createGameForMode } from "@/lib/server/game-service";
import { errorResponse, successResponse } from "@/lib/server/http";

const createSchema = z.object({
  mode: z.enum(["ai", "pvp"]),
  boardSize: z.number().int().min(2).max(9).default(5),
  difficulty: z.enum(["basic", "standard", "hard"]).default("standard"),
  displayName: z.string().trim().min(1).max(40).default("Player 1")
});

export async function POST(request: NextRequest) {
  try {
    const body = createSchema.parse(await request.json());
    const result = await createGameForMode(body);
    return successResponse(result, { status: 201, credential: result.credential });
  } catch (error) {
    return errorResponse(error);
  }
}

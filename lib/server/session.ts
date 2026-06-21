import crypto from "node:crypto";
import type { NextRequest } from "next/server";

export type PlayerCredential = {
  playerId: string;
  token: string;
};

export function createCredential(playerId = crypto.randomUUID()): PlayerCredential {
  return { playerId, token: crypto.randomBytes(32).toString("base64url") };
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getCredentialFromRequest(request: NextRequest): PlayerCredential | undefined {
  const raw = request.cookies.get("matimato_player")?.value;
  if (!raw) return undefined;
  const [playerId, token] = raw.split(".");
  if (!playerId || !token) return undefined;
  return { playerId, token };
}

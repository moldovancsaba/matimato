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

export function getCredentialCookieName() {
  return "matimato_players";
}

export function encodeCredentialCookie(gameId: string, credential: PlayerCredential, existing?: string) {
  const map = decodeCredentialMap(existing);
  map[gameId] = credential;
  return Buffer.from(JSON.stringify(map)).toString("base64url");
}

export function getCredentialFromRequest(request: NextRequest, gameId: string): PlayerCredential | undefined {
  const raw = request.cookies.get(getCredentialCookieName())?.value;
  if (!raw) return undefined;
  return decodeCredentialMap(raw)[gameId];
}

function decodeCredentialMap(raw?: string): Record<string, PlayerCredential> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Record<string, PlayerCredential>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

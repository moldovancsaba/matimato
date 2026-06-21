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
  return Buffer.from(JSON.stringify(pruneCredentialMap(map))).toString("base64url");
}

export function getCredentialFromRequest(request: NextRequest, gameId: string): PlayerCredential | undefined {
  const raw = request.cookies.get(getCredentialCookieName())?.value;
  if (!raw) return undefined;
  return decodeCredentialMap(raw)[gameId];
}

function decodeCredentialMap(raw?: string): Record<string, PlayerCredential> {
  if (!raw || raw.length > 8192) return {};
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Record<string, PlayerCredential>;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([gameId, credential]) => isSafeId(gameId) && isCredential(credential))
    );
  } catch {
    return {};
  }
}

function pruneCredentialMap(map: Record<string, PlayerCredential>) {
  return Object.fromEntries(Object.entries(map).slice(-16));
}

function isCredential(value: unknown): value is PlayerCredential {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as PlayerCredential).playerId === "string" &&
    typeof (value as PlayerCredential).token === "string" &&
    isSafeId((value as PlayerCredential).playerId) &&
    /^[A-Za-z0-9_-]{32,128}$/.test((value as PlayerCredential).token)
  );
}

function isSafeId(value: string) {
  return /^[A-Za-z0-9_-]{1,80}$/.test(value);
}

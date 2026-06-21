import crypto from "node:crypto";
import type { NextRequest } from "next/server";

export type ProfileCredential = {
  profileId: string;
  token: string;
};

export function createProfileCredential(profileId = crypto.randomUUID()): ProfileCredential {
  return { profileId, token: crypto.randomBytes(32).toString("base64url") };
}

export function hashProfileToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getProfileCookieName() {
  return "matimato_profile";
}

export function encodeProfileCookie(credential: ProfileCredential) {
  return Buffer.from(JSON.stringify(credential)).toString("base64url");
}

export function getProfileCredentialFromRequest(request: NextRequest): ProfileCredential | undefined {
  const raw = request.cookies.get(getProfileCookieName())?.value;
  if (!raw || raw.length > 1024) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as ProfileCredential;
    if (!isProfileCredential(parsed)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function isProfileCredential(value: unknown): value is ProfileCredential {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as ProfileCredential).profileId === "string" &&
    typeof (value as ProfileCredential).token === "string" &&
    /^[A-Za-z0-9_-]{1,80}$/.test((value as ProfileCredential).profileId) &&
    /^[A-Za-z0-9_-]{32,128}$/.test((value as ProfileCredential).token)
  );
}

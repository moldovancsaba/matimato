import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getRuntimeConfig } from "../config";
import { sanitizeServerMessage, toAppError } from "./errors";
import type { PlayerCredential } from "./session";
import { encodeCredentialCookie, getCredentialCookieName } from "./session";

export function successResponse(
  data: unknown,
  options?: { status?: number; credential?: PlayerCredential; gameId?: string; existingCredentialCookie?: string }
) {
  const response = NextResponse.json(data, { status: options?.status ?? 200 });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("X-Content-Type-Options", "nosniff");
  if (options?.credential && options.gameId) {
    setCredentialCookie(response, options.gameId, options.credential, options.existingCredentialCookie);
  }
  return response;
}

export function errorResponse(error: unknown, context?: { route?: string; request?: Request }) {
  const appError = toAppError(error);
  const requestId = context?.request?.headers.get("x-vercel-id") || crypto.randomUUID();
  console.error(JSON.stringify({
    level: "error",
    route: context?.route,
    requestId,
    code: appError.code,
    status: appError.status,
    retryable: appError.retryable,
    message: sanitizeServerMessage(appError.message)
  }));
  const response = NextResponse.json(
    { error: { code: appError.code, message: appError.publicMessage, retryable: appError.retryable, requestId } },
    { status: appError.status }
  );
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

function setCredentialCookie(response: NextResponse, gameId: string, credential: PlayerCredential, existing?: string) {
  const config = getRuntimeConfig();
  response.cookies.set(getCredentialCookieName(), encodeCredentialCookie(gameId, credential, existing), {
    httpOnly: true,
    sameSite: "lax",
    secure: config.secureCookies,
    path: "/",
    maxAge: 60 * 60 * 24
  });
}

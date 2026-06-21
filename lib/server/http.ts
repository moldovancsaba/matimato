import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getRuntimeConfig } from "../config";
import { toAppError } from "./errors";
import type { PlayerCredential } from "./session";
import { encodeCredentialCookie, getCredentialCookieName } from "./session";

export function successResponse(
  data: unknown,
  options?: { status?: number; credential?: PlayerCredential; gameId?: string; existingCredentialCookie?: string }
) {
  const response = NextResponse.json(data, { status: options?.status ?? 200 });
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
    message: appError.message
  }));
  return NextResponse.json(
    { error: { code: appError.code, message: appError.publicMessage, retryable: appError.retryable, requestId } },
    { status: appError.status }
  );
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

import { NextResponse } from "next/server";
import { getRuntimeConfig } from "../config";
import { toAppError } from "./errors";
import type { PlayerCredential } from "./session";

export function successResponse(data: unknown, options?: { status?: number; credential?: PlayerCredential }) {
  const response = NextResponse.json(data, { status: options?.status ?? 200 });
  if (options?.credential) setCredentialCookie(response, options.credential);
  return response;
}

export function errorResponse(error: unknown) {
  const appError = toAppError(error);
  return NextResponse.json(
    { error: { code: appError.code, message: appError.message, retryable: appError.retryable } },
    { status: appError.status }
  );
}

function setCredentialCookie(response: NextResponse, credential: PlayerCredential) {
  const config = getRuntimeConfig();
  response.cookies.set("matimato_player", `${credential.playerId}.${credential.token}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.secureCookies,
    path: "/",
    maxAge: 60 * 60 * 24
  });
}

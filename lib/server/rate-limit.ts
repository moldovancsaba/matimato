import { NextRequest } from "next/server";
import { AppError } from "./errors";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function assertRateLimit(
  request: NextRequest,
  options: { route: string; limit: number; windowMs: number }
) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = `${options.route}:${ip}`;
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return;
  }

  if (current.count >= options.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    throw new AppError("RATE_LIMITED", `Too many requests. Try again in ${retryAfterSeconds} seconds.`, 429, true);
  }

  current.count += 1;
}

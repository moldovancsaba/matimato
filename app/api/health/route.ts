import { NextResponse } from "next/server";
import { getRuntimeConfig } from "@/lib/config";
import { checkDatabaseReady } from "@/lib/server/store";

export async function GET() {
  const config = getRuntimeConfig();
  const readiness = config.mongodbUri || config.useMemoryStore
    ? await checkDatabaseReady()
    : { ok: false, db: "missing" as const };
  const response = NextResponse.json({
    ok: readiness.ok,
    runtime: "vercel-nextjs",
    configured: Boolean(config.mongodbUri || config.useMemoryStore),
    db: readiness.db,
    checkedAt: new Date().toISOString()
  }, { status: readiness.ok ? 200 : 503 });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

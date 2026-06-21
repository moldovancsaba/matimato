import { NextResponse } from "next/server";
import { getRuntimeConfig } from "@/lib/config";

export async function GET() {
  const config = getRuntimeConfig();
  return NextResponse.json({
    ok: true,
    runtime: "vercel-nextjs",
    configured: Boolean(config.mongodbUri || config.useMemoryStore),
    db: config.mongodbUri ? "configured" : config.useMemoryStore ? "memory" : "missing",
    checkedAt: new Date().toISOString()
  });
}

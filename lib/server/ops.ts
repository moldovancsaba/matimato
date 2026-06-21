import { getRuntimeConfig } from "@/lib/config";
import { AppError, sanitizeServerMessage } from "./errors";

export type FeatureFlagName = keyof ReturnType<typeof getRuntimeConfig>["featureFlags"];

export function assertFeatureEnabled(feature: FeatureFlagName) {
  if (!getRuntimeConfig().featureFlags[feature]) {
    throw new AppError("FEATURE_DISABLED", "This feature is temporarily unavailable.", 503, true);
  }
}

export async function withTimeout<T>(name: string, operation: Promise<T>, budgetMs = 3000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new AppError("OPERATION_TIMEOUT", `${name} exceeded ${budgetMs}ms.`, 503, true)), budgetMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function nextRetryDelayMs(attempts: number) {
  const bounded = Math.min(Math.max(attempts, 0), 6);
  return Math.min(60_000, 1000 * 2 ** bounded);
}

export function logOperationalFailure(input: { code: string; target: string; entityId?: string; error: unknown }) {
  console.error(JSON.stringify({
    level: "error",
    code: input.code,
    target: input.target,
    entityId: input.entityId,
    retryDelayMs: nextRetryDelayMs(1),
    message: input.error instanceof Error ? sanitizeServerMessage(input.error.message) : "Unknown operational failure"
  }));
}

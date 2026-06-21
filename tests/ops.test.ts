import { describe, expect, it } from "vitest";
import { nextRetryDelayMs, withTimeout } from "@/lib/server/ops";

describe("operational helpers", () => {
  it("uses bounded exponential retry delays", () => {
    expect(nextRetryDelayMs(0)).toBe(1000);
    expect(nextRetryDelayMs(3)).toBe(8000);
    expect(nextRetryDelayMs(99)).toBe(60_000);
  });

  it("times out slow operations", async () => {
    await expect(withTimeout("slow-test", new Promise((resolve) => setTimeout(resolve, 20)), 1)).rejects.toMatchObject({
      code: "OPERATION_TIMEOUT"
    });
  });
});

import { describe, expect, it } from "vitest";
import { encodeCredentialCookie } from "@/lib/server/session";

describe("player credential cookie", () => {
  it("stores multiple game credentials without overwriting the existing game", () => {
    const first = encodeCredentialCookie("game-a", { playerId: "p1", token: "token-a" });
    const second = encodeCredentialCookie("game-b", { playerId: "p2", token: "token-b" }, first);
    const parsed = JSON.parse(Buffer.from(second, "base64url").toString("utf8"));

    expect(parsed["game-a"]).toEqual({ playerId: "p1", token: "token-a" });
    expect(parsed["game-b"]).toEqual({ playerId: "p2", token: "token-b" });
  });
});

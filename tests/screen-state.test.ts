import { describe, expect, it } from "vitest";
import { resolveScreen } from "@/lib/game/screen-state";

describe("screen state resolver", () => {
  it("uses the setup screen when no game is loaded", () => {
    expect(resolveScreen(null, "home")).toBe("home");
    expect(resolveScreen(null, "setup")).toBe("setup");
  });

  it("routes waiting battle games to the battle lobby", () => {
    expect(resolveScreen({ mode: "pvp", status: "waiting" }, "home")).toBe("battleLobby");
  });

  it("routes active games to the match screen", () => {
    expect(resolveScreen({ mode: "pvp", status: "active" }, "home")).toBe("match");
    expect(resolveScreen({ mode: "ai", status: "active" }, "home")).toBe("match");
  });

  it("routes terminal games to the result screen", () => {
    expect(resolveScreen({ mode: "pvp", status: "finished" }, "home")).toBe("result");
    expect(resolveScreen({ mode: "pvp", status: "expired" }, "home")).toBe("result");
  });
});

import { describe, expect, it } from "vitest";
import { addToast, dismissToast, type GameToast } from "@/lib/game/toasts";

function toast(id: string): GameToast {
  return { id, tone: "success", title: id, ttlMs: 1000 };
}

describe("game toast queue", () => {
  it("adds newest toasts first and caps the queue", () => {
    const queue = [toast("a"), toast("b"), toast("c")];
    expect(addToast(queue, toast("d")).map((item) => item.id)).toEqual(["d", "a", "b"]);
  });

  it("replaces duplicate toast ids", () => {
    const queue = [toast("a"), toast("b")];
    expect(addToast(queue, { ...toast("b"), title: "updated" })).toEqual([
      { ...toast("b"), title: "updated" },
      toast("a")
    ]);
  });

  it("dismisses by id", () => {
    expect(dismissToast([toast("a"), toast("b")], "a")).toEqual([toast("b")]);
  });
});

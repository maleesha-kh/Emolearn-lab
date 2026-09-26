import { beforeEach, describe, expect, it, vi } from "vitest";

let storage: typeof import("./storage");
beforeEach(async () => {
  vi.resetModules();
  storage = await import("./storage");
});

function breakLocalStorage(methods: ("getItem" | "setItem" | "removeItem")[]) {
  for (const m of methods) {
    vi.spyOn(Storage.prototype, m).mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
  }
}

describe("storage", () => {
  it("reads and writes through localStorage when it works", () => {
    storage.safeSet("k", "v");
    expect(localStorage.getItem("k")).toBe("v");
    expect(storage.safeGet("k")).toBe("v");
    storage.safeRemove("k");
    expect(storage.safeGet("k")).toBeNull();
  });

  it("returns null when a read throws", () => {
    breakLocalStorage(["getItem"]);
    expect(storage.safeGet("k")).toBeNull();
  });

  it("keeps a failed write in memory until it is removed", () => {
    breakLocalStorage(["getItem", "setItem", "removeItem"]);
    storage.safeSet("k", "v");
    expect(storage.safeGet("k")).toBe("v");
    storage.safeRemove("k");
    expect(storage.safeGet("k")).toBeNull();
  });

  it("prefers a newer successful write over the memory copy", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw new Error("quota");
    });
    storage.safeSet("k", "old");
    setItem.mockRestore();
    storage.safeSet("k", "new");
    expect(storage.safeGet("k")).toBe("new");
  });
});

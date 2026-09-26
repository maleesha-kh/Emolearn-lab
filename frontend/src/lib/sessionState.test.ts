import { describe, expect, it, vi } from "vitest";
import { readSessionState, saveSessionState, type SessionState } from "./sessionState";

const KEY = "emolearn_session_state";
const store = (value: unknown) => sessionStorage.setItem(KEY, JSON.stringify(value));
const child = (screen: string, extra: object = {}) => ({ playerId: "p1", screen, parentView: "overview", parentEntry: "profile", mood: null, ...extra });

describe("readSessionState", () => {
  it("returns null when nothing is saved", () => {
    expect(readSessionState()).toBeNull();
  });

  it("returns null for corrupt or non-object state", () => {
    sessionStorage.setItem(KEY, "{not json");
    expect(readSessionState()).toBeNull();
    store(42);
    expect(readSessionState()).toBeNull();
    store(null);
    expect(readSessionState()).toBeNull();
  });

  it("returns null when sessionStorage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readSessionState()).toBeNull();
  });

  it("returns null for an unknown screen", () => {
    store(child("nowhere"));
    expect(readSessionState()).toBeNull();
  });

  it("returns null for a child screen without a player", () => {
    store(child("profile", { playerId: null }));
    expect(readSessionState()).toBeNull();
    store(child("profile", { playerId: "" }));
    expect(readSessionState()).toBeNull();
  });

  it("restores a child screen", () => {
    store(child("dictionary"));
    expect(readSessionState()).toMatchObject({ playerId: "p1", screen: "dictionary", mood: null });
  });

  it.each(["gameround", "loading", "r-wrong", "t-correct", "summary"])("sends mid-game screen %s back to Play", (screen) => {
    store(child(screen));
    expect(readSessionState()).toMatchObject({ playerId: "p1", screen: "gamestart" });
  });

  it("restores a mood screen with a valid mood", () => {
    store(child("res-sad", { mood: "sad" }));
    expect(readSessionState()).toMatchObject({ screen: "res-sad", mood: "sad" });
    store(child("diary", { mood: "angry" }));
    expect(readSessionState()).toMatchObject({ screen: "diary", mood: "angry" });
  });

  it("drops a mood screen whose mood is missing or invalid", () => {
    store(child("res-happy", { mood: null }));
    expect(readSessionState()).toBeNull();
    store(child("res-happy", { mood: "Happy" }));
    expect(readSessionState()).toBeNull();
  });

  it("only keeps the mood for mood screens", () => {
    store(child("profile", { mood: "happy" }));
    expect(readSessionState()).toMatchObject({ screen: "profile", mood: null });
  });

  it("sends the parent area to the PIN screen, with or without a player", () => {
    store({ playerId: null, screen: "parent", parentView: "diary", parentEntry: "welcome", mood: null });
    expect(readSessionState()).toEqual({ playerId: null, screen: "pin", parentView: "diary", parentEntry: "welcome", mood: null });
    store(child("pin", { parentView: "settings" }));
    expect(readSessionState()).toMatchObject({ playerId: "p1", screen: "pin", parentView: "settings" });
  });

  it("drops a parent state with an invalid view or entry", () => {
    store(child("parent", { parentView: "secrets" }));
    expect(readSessionState()).toBeNull();
    store(child("parent", { parentEntry: "nowhere" }));
    expect(readSessionState()).toBeNull();
  });
});

describe("saveSessionState", () => {
  const state: SessionState = { playerId: "p1", screen: "profile", parentView: "overview", parentEntry: "profile", mood: null };

  it("round-trips through sessionStorage", () => {
    saveSessionState(state);
    expect(readSessionState()).toEqual(state);
  });

  it("does not throw when sessionStorage is unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => saveSessionState(state)).not.toThrow();
  });
});

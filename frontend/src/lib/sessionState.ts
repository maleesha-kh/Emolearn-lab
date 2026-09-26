import type { Mood, Scr } from "../types";
import type { ParentView } from "../screens/ParentScreen";

// Where the app was, so a page refresh can return there. Never holds the PIN.
const SESSION_STATE_KEY = "emolearn_session_state";

export type ParentEntry = "welcome" | "profile";

export interface SessionState {
  playerId: string | null;
  screen: Scr;
  parentView: ParentView;
  parentEntry: ParentEntry;
  mood: Mood | null;
}

const PARENT_VIEWS: ParentView[] = ["overview", "children", "diary", "settings", "about"];
const MOODS: Mood[] = ["happy", "sad", "angry", "surprised"];
// A game can't be resumed after a refresh, so these start a new one
const GAME_SCREENS: Scr[] = ["gamestart", "gameround", "loading", "r-correct", "r-wrong", "t-correct", "t-wrong", "summary"];
const MOOD_SCREENS: Scr[] = ["res-happy", "res-sad", "res-angry", "res-surprised", "diary"];
const CHILD_SCREENS: Scr[] = ["howtoplay", "moodcheckin", "profile", "achievements", "dictionary", "askemo"];

export function saveSessionState(state: SessionState): void {
  try {
    sessionStorage.setItem(SESSION_STATE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable; a refresh will start at Welcome
  }
}

// The state to restore after a refresh, with the screen already mapped
// (game screens become "gamestart", the parent area becomes "pin").
// Null means start at Welcome.
export function readSessionState(): SessionState | null {
  let saved: any;
  try {
    const raw = sessionStorage.getItem(SESSION_STATE_KEY);
    if (!raw) return null;
    saved = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!saved || typeof saved !== "object") return null;

  const playerId = typeof saved.playerId === "string" && saved.playerId ? saved.playerId : null;
  const mood: Mood | null = MOODS.includes(saved.mood) ? saved.mood : null;
  const base = { playerId, parentView: "overview" as ParentView, parentEntry: "profile" as ParentEntry, mood: null };

  if (saved.screen === "pin" || saved.screen === "parent") {
    if (!PARENT_VIEWS.includes(saved.parentView)) return null;
    if (saved.parentEntry !== "welcome" && saved.parentEntry !== "profile") return null;
    return { ...base, screen: "pin", parentView: saved.parentView, parentEntry: saved.parentEntry };
  }

  if (!playerId) return null;
  if (GAME_SCREENS.includes(saved.screen)) return { ...base, screen: "gamestart" };
  if (MOOD_SCREENS.includes(saved.screen)) return mood ? { ...base, screen: saved.screen, mood } : null;
  if (CHILD_SCREENS.includes(saved.screen)) return { ...base, screen: saved.screen };
  return null;
}

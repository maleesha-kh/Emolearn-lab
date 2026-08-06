export type Scr =
  | "welcome" | "howtoplay" | "moodcheckin"
  | "res-happy" | "res-sad" | "res-angry" | "res-surprised"
  | "gamestart" | "gameround" | "loading"
  | "r-correct" | "r-wrong"
  | "t-correct" | "t-wrong"
  | "summary" | "profile" | "achievements" | "dictionary"
  | "pin" | "parent";

// Real emotion classes — these map 1:1 to /public/images/characters/<Mood>/
export type Mood = "happy" | "sad" | "angry" | "surprised";

// Decorative-only robot mascot expressions (not tied to the dataset)
export type EmoE = "happy"|"excited"|"waving"|"curious"|"caring"|"calm"|"magnifying"|"jumping"|"peek";

// Character-image "poses" used across screens. Only the 4 real Mood values
// have real photos; the rest are decorative aliases mapped to the closest
// real emotion by lib/imageBank.ts (see POSE_TO_EMOTION).
export type GirlP = "happy"|"sad"|"angry"|"surprised"|"jumping"|"welcoming"|"calm"|"confident"|"celebrating";

export interface Round {
  find: string;
  color: string;
  emoji: string;
  opts: Mood[];
  correct: number;
  ai: string;
}

export interface EmotionInfo {
  label: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
  text: string;
}

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  color: string;
  unlocked: boolean;
}

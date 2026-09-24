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
  hint: string;
}

export interface AvatarOption {
  id: string;
  emoji: string;
  color: string;
  image?: string;
}

// --- Backend API types (field casing matches the JSON responses exactly) ---

export interface Player {
  id: string;
  nickname: string;
  avatar_id: string;
}

export interface EmotionStat {
  correct: number;
  attempts: number;
}

export interface RoundSummary {
  round_no: number;
  target_emotion: Mood;
  child_correct: boolean;
}

export interface SessionSummary {
  id: string;
  finished_at: string | null;
  score: number | null;
  stars: number | null;
  rounds: RoundSummary[];
}

export interface BadgeRecord {
  badge_id: string;
  earned_at: string;
}

export interface ProfileData {
  player: Player;
  total_stars: number;
  sessions_played: number;
  emotion_stats: Record<Mood, EmotionStat>;
  recent_sessions: SessionSummary[];
  badges: BadgeRecord[];
}

export interface SessionOut {
  id: string;
  player_id: string;
  mood_checkin: string | null;
  started_at: string;
  finished_at: string | null;
  score: number | null;
  stars: number | null;
}

export interface RoundCreate {
  round_no: number;
  target_emotion: Mood;
  chosen_image: string;
  child_correct: boolean;
  predicted_emotion?: Mood | null;
  confidence?: number | null;
}

export interface RoundOut {
  round_no: number;
  target_emotion: Mood;
  chosen_image: string;
  child_correct: boolean;
  predicted_emotion: Mood | null;
  confidence: number | null;
}

export interface FinishSessionOut {
  session: SessionOut;
  new_badges: string[];
}

export interface PinStatus {
  is_set: boolean;
}

export interface PinVerifyResult {
  valid: boolean;
}
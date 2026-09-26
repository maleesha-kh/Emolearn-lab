export type Scr =
  | "welcome" | "howtoplay" | "moodcheckin"
  | "res-happy" | "res-sad" | "res-angry" | "res-surprised"
  | "gamestart" | "gameround" | "loading"
  | "r-correct" | "r-wrong"
  | "t-correct" | "t-wrong"
  | "summary" | "profile" | "achievements" | "dictionary"
  | "pin" | "parent" | "diary" | "askemo";

// Real emotion classes — these map 1:1 to /public/images/characters/<Mood>/
export type Mood = "happy" | "sad" | "angry" | "surprised";

// Decorative-only robot mascot expressions (not tied to the dataset)
export type EmoE = "happy"|"excited"|"waving"|"curious"|"caring"|"calm"|"magnifying"|"jumping"|"peek";

// Character-image "poses" used across screens. Only the 4 real Mood values
// have real photos; the rest are decorative aliases mapped to the closest
// real emotion by lib/imageBank.ts (see POSE_TO_EMOTION).
export type GirlP = "happy"|"sad"|"angry"|"surprised"|"jumping"|"welcoming"|"calm"|"confident"|"celebrating";

export interface Round {
  emotion: Mood;
  find: string;
  color: string;
  emoji: string;
  opts: Mood[];
}

/** A round as played in one game: opts shuffled, with one image per option. */
export interface GameRound extends Round {
  images: string[];
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
  has_recovery_code: boolean;
}

export interface PinVerifyResult {
  valid: boolean;
}

export interface RecoveryCodeResult {
  recovery_code: string;
}

export interface EmotionAccuracy {
  correct: number;
  attempts: number;
  percent: number | null;
}

export interface DashboardRound {
  round_no: number;
  target_emotion: Mood;
  child_correct: boolean;
  predicted_emotion: Mood | null;
  confidence: number | null;
}

export interface DashboardSession {
  id: string;
  started_at: string;
  finished_at: string | null;
  mood_checkin: string | null;
  score: number | null;
  stars: number | null;
  rounds: DashboardRound[];
}

export interface DashboardData {
  player: Player;
  total_sessions: number;
  average_score: number | null;
  emotion_accuracy: Record<Mood, EmotionAccuracy>;
  best_emotion: Mood | null;
  needs_practice: Mood | null;
  all_equal: boolean;
  badges: BadgeRecord[];
  sessions: DashboardSession[];
  dictionary_completed: number;
}

export interface DictionaryEntry {
  emotion: Mood;
  completed_at: string;
}

export interface DictionaryProgress {
  completed: DictionaryEntry[];
}

export interface DictionaryCompleteResult extends DictionaryProgress {
  new_badges: string[];
  newly_completed: boolean;
}

export type DiaryReason = "school" | "friends" | "family" | "playing" | "pets" | "other";
export type DiaryIntensity = "little" | "lot";
export type ConcernLevel = "none" | "watch" | "high";

export interface DiaryEntryCreate {
  emotion: Mood;
  intensity: DiaryIntensity;
  reason_tags: DiaryReason[];
  note?: string | null;
}

export interface DiaryEntry {
  id: number;
  player_id: string;
  created_at: string;
  emotion: Mood;
  reason_tags: DiaryReason[];
  note: string | null;
  intensity: DiaryIntensity;
  reason_used: DiaryReason | null;
  reason_source: "chip" | "model" | "default" | null;
  reason_confidence: number | null;
  sentiment: "positive" | "negative" | null;
  sentiment_confidence: number | null;
  bot_reply: string | null;
  concern_flag: boolean;
  concern_level: ConcernLevel;
  concern_categories: string[];
}

export interface DiaryTips {
  diary_entry_id: number;
  summary: string;
  tips: string[];
  talk_starter: string;
  source: "tip_bank" | "concern";
  concern_level: ConcernLevel;
  created_at: string;
}

export interface BuddySuggestion {
  id: string;
  question: string;
}

export interface BuddyAnswer {
  answer: string;
  suggestions: BuddySuggestion[];
  related: BuddySuggestion[];
  remaining_today: number;
  resting: boolean;
}

export interface BuddyMessage {
  question: string;
  answer: string;
  concern_level: ConcernLevel;
  concern_categories: string[];
  created_at: string;
}

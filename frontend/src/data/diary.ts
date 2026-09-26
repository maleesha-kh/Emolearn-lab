import type { DiaryReason } from "../types";

export const DIARY_CHIPS: { reason: DiaryReason; label: string; emoji: string }[] = [
  { reason: "school", label: "School", emoji: "🏫" },
  { reason: "friends", label: "Friends", emoji: "👫" },
  { reason: "family", label: "Family", emoji: "👨‍👩‍👧" },
  { reason: "playing", label: "Playing", emoji: "🎮" },
  { reason: "pets", label: "Pets", emoji: "🐾" },
  { reason: "other", label: "Something else", emoji: "✏️" },
];

export const CONCERN_CATEGORY_TEXT: Record<string, string> = {
  hurt_by_someone: "mentions being hurt by someone",
  self_harm: "mentions hurting themselves",
  fear_of_a_person: "mentions being scared of someone",
  secrets_or_touching: "mentions secrets or touching",
  danger: "mentions something dangerous",
};

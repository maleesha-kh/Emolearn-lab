import type { Round } from "../types";

export const ROUNDS: Round[] = [
  { find: "HAPPY",     color: "#FFC107", emoji: "😊", opts: ["happy", "sad", "surprised"],   correct: 0 },
  { find: "SAD",       color: "#42A5F5", emoji: "😢", opts: ["angry", "sad", "happy"],        correct: 1 },
  { find: "ANGRY",     color: "#EF5350", emoji: "😠", opts: ["surprised", "happy", "angry"],  correct: 2 },
  { find: "SURPRISED", color: "#AB47BC", emoji: "😲", opts: ["sad", "surprised", "angry"],    correct: 1 },
];
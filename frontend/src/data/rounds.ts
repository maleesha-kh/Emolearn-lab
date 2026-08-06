import type { Round } from "../types";

export const ROUNDS: Round[] = [
  { find: "HAPPY",     color: "#FFC107", emoji: "😊", opts: ["happy", "sad", "surprised"],   correct: 0, ai: "bright eyes and a big smile — that means HAPPY! 😊" },
  { find: "SAD",       color: "#42A5F5", emoji: "😢", opts: ["angry", "sad", "happy"],        correct: 1, ai: "droopy shoulders and sad eyes — that means SAD! 😢" },
  { find: "ANGRY",     color: "#EF5350", emoji: "😠", opts: ["surprised", "happy", "angry"],  correct: 2, ai: "tight fists and a deep frown — that means ANGRY! 😠" },
  { find: "SURPRISED", color: "#AB47BC", emoji: "😲", opts: ["sad", "surprised", "angry"],    correct: 1, ai: "wide eyes and open mouth — that means SURPRISED! 😲" },
];

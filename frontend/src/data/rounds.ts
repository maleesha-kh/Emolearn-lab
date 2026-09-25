import type { Round } from "../types";

export const ROUNDS: Round[] = [
  { emotion: "happy",     find: "HAPPY",     color: "#FFC107", emoji: "😊", opts: ["happy", "sad", "surprised"] },
  { emotion: "sad",       find: "SAD",       color: "#42A5F5", emoji: "😢", opts: ["angry", "sad", "happy"] },
  { emotion: "angry",     find: "ANGRY",     color: "#EF5350", emoji: "😠", opts: ["surprised", "happy", "angry"] },
  { emotion: "surprised", find: "SURPRISED", color: "#AB47BC", emoji: "😲", opts: ["sad", "surprised", "angry"] },
];

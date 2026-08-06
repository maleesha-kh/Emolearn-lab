import type { Mood, EmotionInfo } from "../types";

export const EI: Record<Mood, EmotionInfo> = {
  happy:     { label: "Happy",     emoji: "😊", color: "#FFC107", bg: "#FFF9C4", border: "#FFC107", text: "#E65100" },
  sad:       { label: "Sad",       emoji: "😢", color: "#42A5F5", bg: "#E3F2FD", border: "#42A5F5", text: "#1565C0" },
  angry:     { label: "Angry",     emoji: "😠", color: "#EF5350", bg: "#FFEBEE", border: "#EF5350", text: "#B71C1C" },
  surprised: { label: "Surprised", emoji: "😲", color: "#AB47BC", bg: "#F3E5F5", border: "#AB47BC", text: "#6A1B9A" },
};

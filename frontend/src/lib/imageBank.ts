import type { Mood, GirlP } from "../types";

// Single character set (the VRoid "Nara" model), 8 pose/photo variants per
// emotion, backgrounds already stripped by scripts/remove_bg.py — see
// public/images/characters/<Mood>/.
const VARIANTS_PER_EMOTION: Record<Mood, number> = {
  happy: 8,
  sad: 8,
  angry: 8,
  surprised: 8,
};

function fileName(emotion: Mood, variant: number): string {
  // matches the dataset's original naming: <emotion>_v<n>_5.png
  return `${emotion}_v${variant}_5.png`;
}

export function imagePath(emotion: Mood, variant: number): string {
  return `/images/characters/${emotion}/${fileName(emotion, variant)}`;
}

// Decorative "poses" (jumping, welcoming, calm, confident, celebrating) used
// on non-game screens don't exist as real photos — we map each to the
// closest real emotion folder so every AnimeGirl/CharacterImage call site
// keeps working unchanged.
const POSE_TO_EMOTION: Record<GirlP, Mood> = {
  happy: "happy",
  sad: "sad",
  angry: "angry",
  surprised: "surprised",
  jumping: "happy",
  celebrating: "happy",
  welcoming: "happy",
  calm: "sad",
  confident: "happy",
};

export function emotionForPose(pose: GirlP): Mood {
  return POSE_TO_EMOTION[pose] ?? "happy";
}

function randInt1toN(n: number): number {
  return 1 + Math.floor(Math.random() * n);
}

// Avoid showing the exact same variant twice in a row for a given emotion
// within this browser session (purely cosmetic — not persisted).
const lastShown: Partial<Record<Mood, number>> = {};

export function pickRandomVariant(emotion: Mood): number {
  const max = VARIANTS_PER_EMOTION[emotion];
  if (max <= 1) return 1;
  let v = randInt1toN(max);
  let guard = 0;
  while (v === lastShown[emotion] && guard < 5) {
    v = randInt1toN(max);
    guard++;
  }
  lastShown[emotion] = v;
  return v;
}

export function pickRandomImage(emotion: Mood): string {
  return imagePath(emotion, pickRandomVariant(emotion));
}

/** One random image per emotion for the mood check-in screen. Call once per mount so it doesn't change mid-interaction. */
export function rollMoodBank(): Record<Mood, string> {
  return {
    happy: pickRandomImage("happy"),
    sad: pickRandomImage("sad"),
    angry: pickRandomImage("angry"),
    surprised: pickRandomImage("surprised"),
  };
}

/** One random image per option emotion. Call once per round (not on every re-render) so the images stay the same through the result screens. */
export function rollRoundImages(emotions: Mood[]): string[] {
  return emotions.map((e) => pickRandomImage(e));
}

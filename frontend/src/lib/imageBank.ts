import type { Mood, GirlP } from "../types";

// Per emotion: 8 dataset variants (the VRoid "Nara" model) followed by 10
// game variants, backgrounds already stripped by scripts/remove_bg.py — see
// public/images/characters/<Mood>/.
const DATASET_VARIANTS = 8;
const GAME_VARIANTS = 10;
const VARIANTS_PER_EMOTION: Record<Mood, number> = {
  happy: DATASET_VARIANTS + GAME_VARIANTS,
  sad: DATASET_VARIANTS + GAME_VARIANTS,
  angry: DATASET_VARIANTS + GAME_VARIANTS,
  surprised: DATASET_VARIANTS + GAME_VARIANTS,
};

function fileName(emotion: Mood, variant: number): string {
  if (variant <= DATASET_VARIANTS) {
    // matches the dataset's original naming: <emotion>_v<n>_5.png
    return `${emotion}_v${variant}_5.png`;
  }
  const gameNumber = String(variant - DATASET_VARIANTS).padStart(2, "0");
  return `${emotion}_game_${gameNumber}.png`;
}

export function imagePath(emotion: Mood, variant: number): string {
  return `/images/characters/${emotion}/${fileName(emotion, variant)}`;
}

export function characterImages(emotion: Mood): string[] {
  return Array.from({ length: VARIANTS_PER_EMOTION[emotion] }, (_, i) => imagePath(emotion, i + 1));
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

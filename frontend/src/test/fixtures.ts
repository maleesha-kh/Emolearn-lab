import type { GameRound, Mood } from "../types";
import type { Explanation, PredictionApiResponse, PredictionResult } from "../lib/predictionClient";

export function makePrediction(overrides: Partial<PredictionResult> = {}): PredictionResult {
  return {
    emotion: "happy",
    confidence: 0.87,
    mode: "fused",
    faceEmotion: "happy",
    poseEmotion: "happy",
    heatmapBase64: "data:image/png;base64,AAAA",
    explanation: makeExplanation(),
    ...overrides,
  };
}

export function makeExplanation(overrides: Partial<Explanation> = {}): Explanation {
  return {
    reason: "The mouth is curved up in a big smile.",
    face_focus: "mouth",
    face_region_scores: { mouth: 0.7 },
    face_cue: "smile",
    pose_cues: ["arms up"],
    pose_focus: "arms",
    pose_group_scores: { arms: 0.6 },
    evidence: ["Smile detected", "Arms raised"],
    ...overrides,
  };
}

const probs = (top: Mood): Record<Mood, number> => ({ happy: 0.1, sad: 0.1, angry: 0.1, surprised: 0.1, [top]: 0.7 });

export function makeApiResponse(overrides: Partial<PredictionApiResponse> = {}): PredictionApiResponse {
  return {
    emotion: "sad",
    confidence: 0.64,
    mode: "fused",
    fused_probs: probs("sad"),
    face: { emotion: "sad", probs: probs("sad") },
    pose: { emotion: "angry", probs: probs("angry") },
    weights: { face: 0.6, pose: 0.4 },
    heatmap_base64: "data:image/png;base64,BBBB",
    heatmap_emotion: "sad",
    explanation: makeExplanation(),
    ...overrides,
  };
}

export function makeRound(emotion: Mood, opts: Mood[]): GameRound {
  return {
    emotion,
    find: emotion.toUpperCase(),
    color: "#000000",
    emoji: "🙂",
    opts,
    images: opts.map((m) => `/images/characters/${m}/${m}_test.png`),
  };
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

import type { Mood } from "../types";
import type { Explanation, PredictionRequest, PredictionResult } from "./predictionClient";

// Region/cue pairs the mock picks from, so the demo's "why" still varies
// between rounds. The real explanation comes from the backend's Grad-CAM
// and pose analysis (backend/app/ml/explain.py).
const MOCK_CUES: Record<Mood, [Explanation["face_focus"], string][]> = {
  happy: [["mouth", "the mouth was curved up in a big smile"], ["eyes", "the eyes were bright and smiling"]],
  sad: [["eyes", "the eyes were droopy and looking down"], ["mouth", "the mouth was turned down at the corners"]],
  angry: [["eyebrows", "the eyebrows were pulled down into a frown"], ["mouth", "the mouth was pressed tight and grumpy"]],
  surprised: [["eyes", "the eyes were big and wide open"], ["mouth", "the mouth was open in a big \"O\""]],
};

/**
 * Fakes a prediction using the tapped image's known emotion, plus a
 * plausible confidence and a short delay. Only used when VITE_USE_MOCK is
 * set, so the UI can still be demoed without the backend running.
 */
export async function predictEmotion({ trueEmotion }: PredictionRequest): Promise<PredictionResult> {
  await new Promise((r) => setTimeout(r, 900 + Math.random() * 700));
  const confidence = Math.min(0.99, 0.84 + Math.random() * 0.14);
  const options = MOCK_CUES[trueEmotion];
  const [focus, cue] = options[Math.floor(Math.random() * options.length)];
  return {
    emotion: trueEmotion,
    confidence,
    mode: "face_only",
    faceEmotion: trueEmotion,
    poseEmotion: null,
    heatmapBase64: null,
    explanation: {
      reason: `I looked closely at the ${focus}, and ${cue}. I'm very sure this is ${trueEmotion.toUpperCase()}!`,
      face_focus: focus,
      face_region_scores: {},
      face_cue: null,
      pose_cues: [],
      pose_focus: null,
      pose_group_scores: {},
      evidence: ["Demo mode: this answer is simulated, not from the real model"],
    },
  };
}
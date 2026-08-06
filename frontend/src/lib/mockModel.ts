import type { Mood } from "../types";

export interface PredictionResult {
  emotion: Mood;
  confidence: number; // 0..1
}

/**
 * STUB MODEL — swap the body of this function for a real call once the
 * classifier is trained (see notes below). It does not run any real
 * inference; it fakes a correct prediction using the true emotion of the
 * image that was tapped (we already know this from the folder it came from)
 * plus a plausible confidence score and a short artificial "thinking" delay,
 * so the full capture → analyzing → result UX works end-to-end right now,
 * with exactly one place to change when the real model is ready.
 *
 * When the real model is ready, the two integration options are:
 *
 * 1. Client-side (TensorFlow.js / ONNX Runtime Web): only works cleanly if
 *    the whole pipeline is a single exportable neural net. Your fusion
 *    approach combines a MobileNetV2 CNN branch with a scikit-learn Random
 *    Forest on MediaPipe pose features — sklearn models don't convert to
 *    TFJS/ONNX painlessly, so this path means re-implementing the RF (or
 *    swapping it for a small neural head) purely to make it portable.
 *
 * 2. Server-side (recommended given your current stack): stand up a small
 *    FastAPI service that loads the saved MobileNetV2 + Random Forest +
 *    fusion-weight artifacts as-is, exposes one POST /predict endpoint
 *    (image + pose landmarks in, {emotion, confidence} out), and call it
 *    from here with fetch(). Keeps your training code and inference code
 *    identical, and the frontend change is just replacing this function's
 *    body with a fetch() call — the rest of the app (screens, state) does
 *    not need to change at all.
 */
export async function predictEmotion(trueEmotion: Mood): Promise<PredictionResult> {
  await new Promise((r) => setTimeout(r, 900 + Math.random() * 700));
  const confidence = Math.min(0.99, 0.84 + Math.random() * 0.14);
  return { emotion: trueEmotion, confidence };
}

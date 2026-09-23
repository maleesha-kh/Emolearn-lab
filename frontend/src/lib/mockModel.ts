import type { PredictionRequest, PredictionResult } from "./predictionClient";

/**
 * Fakes a prediction using the tapped image's known emotion, plus a
 * plausible confidence and a short delay. Only used when VITE_USE_MOCK is
 * set, so the UI can still be demoed without the backend running.
 */
export async function predictEmotion({ trueEmotion }: PredictionRequest): Promise<PredictionResult> {
  await new Promise((r) => setTimeout(r, 900 + Math.random() * 700));
  const confidence = Math.min(0.99, 0.84 + Math.random() * 0.14);
  return { emotion: trueEmotion, confidence, heatmapBase64: null };
}

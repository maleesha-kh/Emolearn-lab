import type { Mood } from "../types";
import { predictEmotion as predictEmotionMock } from "./mockModel";

export interface BranchResult {
  emotion: Mood;
  probs: Record<Mood, number>;
}

// Matches backend/app/schemas/prediction.py exactly.
export interface PredictionApiResponse {
  emotion: Mood;
  confidence: number;
  mode: "fused" | "face_only";
  fused_probs: Record<Mood, number>;
  face: BranchResult;
  pose: BranchResult | null;
  weights: { face: number; pose: number };
  heatmap_base64: string | null;
  heatmap_emotion: Mood;
}

// What the screens actually use today. mode, fused_probs, face/pose and
// weights aren't consumed by the UI yet — add them here if a screen needs
// them, rather than passing the raw API response further down.
export interface PredictionResult {
  emotion: Mood;
  confidence: number;
  heatmapBase64: string | null;
}

export interface PredictionRequest {
  imageUrl: string; // used by the real API
  trueEmotion: Mood; // used by the mock
}

export type PredictionErrorKind = "network" | "invalid_image" | "too_large" | "no_character" | "server";

const ERROR_MESSAGES: Record<PredictionErrorKind, string> = {
  network: "Emo can't hear you right now. Check the internet and try again!",
  invalid_image: "That picture didn't work. Let's try a different one!",
  too_large: "That picture is too big for Emo to see. Try a smaller one!",
  no_character: "Emo couldn't spot a character in that picture. Try again!",
  server: "Emo got a bit confused. Let's try again!",
};

export class PredictionError extends Error {
  kind: PredictionErrorKind;
  constructor(kind: PredictionErrorKind) {
    super(ERROR_MESSAGES[kind]);
    this.kind = kind;
  }
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

async function fetchPrediction(imageUrl: string): Promise<PredictionApiResponse> {
  let imageBlob: Blob;
  try {
    imageBlob = await (await fetch(imageUrl)).blob();
  } catch {
    throw new PredictionError("network");
  }

  const form = new FormData();
  form.append("file", imageBlob, "character.png");

  let response: Response;
  try {
    response = await fetch(`${API_URL}/predict`, { method: "POST", body: form });
  } catch {
    throw new PredictionError("network");
  }

  if (!response.ok) {
    if (response.status === 400) throw new PredictionError("invalid_image");
    if (response.status === 413) throw new PredictionError("too_large");
    if (response.status === 422) throw new PredictionError("no_character");
    throw new PredictionError("server");
  }

  return response.json();
}

function toResult(api: PredictionApiResponse): PredictionResult {
  return { emotion: api.emotion, confidence: api.confidence, heatmapBase64: api.heatmap_base64 };
}

/** Single entry point the screens call — routes to the mock or the real API depending on VITE_USE_MOCK. */
export async function getPrediction(request: PredictionRequest): Promise<PredictionResult> {
  if (USE_MOCK) return predictEmotionMock(request);
  const api = await fetchPrediction(request.imageUrl);
  return toResult(api);
}

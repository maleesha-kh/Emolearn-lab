import type {
  BadgeRecord,
  FinishSessionOut,
  PinStatus,
  PinVerifyResult,
  Player,
  ProfileData,
  RoundCreate,
  RoundOut,
  SessionOut,
  SessionSummary,
} from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

// kind is a string-literal discriminant on purpose: this project builds with
// strict:false, and TypeScript's control-flow narrowing on a boolean-literal
// discriminant (e.g. ok: true | false) doesn't work reliably without
// strictNullChecks, while a string literal narrows fine either way.
export type ApiResult<T> = { kind: "ok"; data: T } | { kind: "error"; status: number | null };

async function request<T>(path: string, options?: RequestInit): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    return { kind: "error", status: null };
  }

  if (!response.ok) return { kind: "error", status: response.status };

  try {
    return { kind: "ok", data: (await response.json()) as T };
  } catch {
    return { kind: "error", status: response.status };
  }
}

export function getPlayers() {
  return request<Player[]>("/players");
}

export function createPlayer(payload: { nickname: string; avatar_id: string }) {
  return request<Player>("/players", { method: "POST", body: JSON.stringify(payload) });
}

export function getPlayer(playerId: string) {
  return request<Player>(`/players/${playerId}`);
}

export function getProfile(playerId: string) {
  return request<ProfileData>(`/players/${playerId}/profile`);
}

export function getPlayerSessions(playerId: string) {
  return request<SessionSummary[]>(`/players/${playerId}/sessions`);
}

export function getPlayerBadges(playerId: string) {
  return request<BadgeRecord[]>(`/players/${playerId}/badges`);
}

export function startSession(payload: { player_id: string; mood_checkin?: string | null }) {
  return request<SessionOut>("/sessions", { method: "POST", body: JSON.stringify(payload) });
}

export function saveRound(sessionId: string, payload: RoundCreate) {
  return request<RoundOut>(`/sessions/${sessionId}/rounds`, { method: "POST", body: JSON.stringify(payload) });
}

export function finishSession(sessionId: string) {
  return request<FinishSessionOut>(`/sessions/${sessionId}/finish`, { method: "PATCH" });
}

export function getPinStatus() {
  return request<PinStatus>("/parent/pin/status");
}

export function setupPin(pin: string) {
  return request<PinStatus>("/parent/pin/setup", { method: "POST", body: JSON.stringify({ pin }) });
}

export function verifyPin(pin: string) {
  return request<PinVerifyResult>("/parent/pin/verify", { method: "POST", body: JSON.stringify({ pin }) });
}

export function changePin(currentPin: string, newPin: string) {
  return request<PinStatus>("/parent/pin", {
    method: "PUT",
    body: JSON.stringify({ current_pin: currentPin, new_pin: newPin }),
  });
}

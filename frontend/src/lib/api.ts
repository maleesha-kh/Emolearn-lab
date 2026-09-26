import type {
  BadgeRecord,
  BuddyAnswer,
  BuddyMessage,
  DashboardData,
  DictionaryCompleteResult,
  DictionaryProgress,
  DiaryEntry,
  DiaryEntryCreate,
  DiaryTips,
  FinishSessionOut,
  Mood,
  PinStatus,
  PinVerifyResult,
  Player,
  ProfileData,
  RecoveryCodeResult,
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
export type ApiResult<T> = { kind: "ok"; data: T } | { kind: "error"; status: number | null; body?: unknown };

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

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }
    return { kind: "error", status: response.status, body };
  }

  if (response.status === 204) {
    return { kind: "ok", data: undefined as T };
  }

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

export function updatePlayer(playerId: string, payload: { nickname?: string; avatar_id?: string }) {
  return request<Player>(`/players/${playerId}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deletePlayer(playerId: string) {
  return request<undefined>(`/players/${playerId}`, { method: "DELETE" });
}

export function getDashboard(playerId: string) {
  return request<DashboardData>(`/players/${playerId}/dashboard`);
}

export function reportCsvUrl(playerId: string) {
  return `${API_URL}/players/${playerId}/report.csv`;
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

export function getDictionaryProgress(playerId: string) {
  return request<DictionaryProgress>(`/players/${playerId}/dictionary`);
}

export function completeDictionaryEmotion(playerId: string, emotion: Mood) {
  return request<DictionaryCompleteResult>(`/players/${playerId}/dictionary/${emotion}/complete`, { method: "POST" });
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
  return request<RecoveryCodeResult>("/parent/pin/setup", { method: "POST", body: JSON.stringify({ pin }) });
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

export function recoverPin(recoveryCode: string, newPin: string) {
  return request<RecoveryCodeResult>("/parent/pin/recover", {
    method: "POST",
    body: JSON.stringify({ recovery_code: recoveryCode, new_pin: newPin }),
  });
}

export function regenerateRecoveryCode(pin: string) {
  return request<RecoveryCodeResult>("/parent/recovery-code/regenerate", {
    method: "POST",
    body: JSON.stringify({ pin }),
  });
}

function parentHeaders(pin: string) {
  return { "Content-Type": "application/json", "X-Parent-Pin": pin };
}

export function createDiaryEntry(playerId: string, payload: DiaryEntryCreate) {
  return request<DiaryEntry>(`/players/${playerId}/diary`, { method: "POST", body: JSON.stringify(payload) });
}

export function getDiary(playerId: string, pin: string, limit = 50) {
  return request<DiaryEntry[]>(`/players/${playerId}/diary?limit=${limit}`, { headers: parentHeaders(pin) });
}

export function deleteDiaryEntry(playerId: string, entryId: number, pin: string) {
  return request<undefined>(`/players/${playerId}/diary/${entryId}`, { method: "DELETE", headers: parentHeaders(pin) });
}

export function getDiaryTips(playerId: string, entryId: number, pin: string) {
  return request<DiaryTips>(`/players/${playerId}/diary/${entryId}/tips`, { method: "POST", headers: parentHeaders(pin) });
}

export function askEmo(playerId: string, question: string) {
  return request<BuddyAnswer>(`/players/${playerId}/buddy/ask`, { method: "POST", body: JSON.stringify({ question }) });
}

export function getBuddyMessages(playerId: string, pin: string, limit = 30) {
  return request<BuddyMessage[]>(`/players/${playerId}/buddy/messages?limit=${limit}`, { headers: parentHeaders(pin) });
}

export function deleteBuddyMessage(playerId: string, messageId: number, pin: string) {
  return request<undefined>(`/players/${playerId}/buddy/messages/${messageId}`, { method: "DELETE", headers: parentHeaders(pin) });
}

export function clearBuddyMessages(playerId: string, pin: string) {
  return request<undefined>(`/players/${playerId}/buddy/messages`, { method: "DELETE", headers: parentHeaders(pin) });
}

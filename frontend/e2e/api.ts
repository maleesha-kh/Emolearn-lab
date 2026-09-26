import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EMOTIONS, enterPin, navTab, type Emotion } from "./fixtures";

// Seeding and checks go straight to the backend; the behaviour under test goes through the UI
export const API_URL = "http://127.0.0.1:8001";

const BACKEND_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "backend");

export type SeededPlayer = { id: string; nickname: string; avatar_id: string };

async function ok<T>(response: Awaited<ReturnType<APIRequestContext["get"]>>): Promise<T> {
  expect(response.ok(), `${response.url()} -> ${response.status()}`).toBe(true);
  return response.status() === 204 ? (undefined as T) : ((await response.json()) as T);
}

export const pinHeader = (pin: string) => ({ "X-Parent-Pin": pin });

export async function seedPlayer(request: APIRequestContext, nickname: string, avatar = "avatar-1") {
  return ok<SeededPlayer>(await request.post(`${API_URL}/players`, { data: { nickname, avatar_id: avatar } }));
}

export async function seedPin(request: APIRequestContext, pin: string) {
  return (await ok<{ recovery_code: string }>(await request.post(`${API_URL}/parent/pin/setup`, { data: { pin } }))).recovery_code;
}

/** A game with a round per emotion; correct only where `correctOn` lists the target. */
export async function seedGame(request: APIRequestContext, playerId: string, correctOn: Emotion[], opts: { finish?: boolean; mood?: Emotion } = {}) {
  const session = await ok<{ id: string }>(
    await request.post(`${API_URL}/sessions`, { data: { player_id: playerId, mood_checkin: opts.mood ?? null } })
  );
  for (const [i, emotion] of EMOTIONS.entries()) {
    await ok(await request.post(`${API_URL}/sessions/${session.id}/rounds`, {
      data: {
        round_no: i + 1,
        target_emotion: emotion,
        chosen_image: `/images/characters/${emotion}/${emotion}_v1_5.png`,
        child_correct: correctOn.includes(emotion),
        predicted_emotion: emotion,
        confidence: 0.9,
      },
    }));
    if (opts.finish === false && i === 0) return session.id;
  }
  if (opts.finish !== false) await ok(await request.patch(`${API_URL}/sessions/${session.id}/finish`));
  return session.id;
}

export async function seedFeeling(request: APIRequestContext, playerId: string, emotion: Emotion) {
  return ok(await request.post(`${API_URL}/players/${playerId}/dictionary/${emotion}/complete`));
}

export async function seedDiary(request: APIRequestContext, playerId: string, note: string) {
  return ok<{ id: number }>(await request.post(`${API_URL}/players/${playerId}/diary`, {
    data: { emotion: "happy", intensity: "little", reason_tags: ["playing"], note },
  }));
}

export async function seedQuestion(request: APIRequestContext, playerId: string, question: string) {
  return ok(await request.post(`${API_URL}/players/${playerId}/buddy/ask`, { data: { question } }));
}

/** Enters the PIN on the parent PIN screen and waits for the parent area. */
export async function unlockParentArea(page: Page, pin: string) {
  await expect(page.getByText("Enter the 4-digit PIN to continue")).toBeVisible();
  const verified = page.waitForResponse((r) => r.url().endsWith("/parent/pin/verify"));
  await enterPin(page, pin);
  expect(await (await verified).json()).toEqual({ valid: true });
  await expect(page.getByRole("button", { name: "Back to Game" })).toBeVisible();
}

/** From a logged-in child's screen, through Me, into the parent area. */
export async function openParentAreaFromMe(page: Page, pin: string) {
  await navTab(page, "Me").click();
  await page.getByTitle("Parent/Teacher").click();
  await unlockParentArea(page, pin);
}

export async function parentTab(page: Page, label: string) {
  await page.getByRole("button", { name: new RegExp(`^\\S+ ${label}$`) }).click();
}

type RowCounts = {
  players: Record<string, Record<string, number>>;
  unlinked_tables: string[];
  dangling_foreign_keys: number;
};

/** Read-only row counts per player from the test database (backend/scripts/count_player_rows.py). */
export function countPlayerRows(...playerIds: string[]): RowCounts {
  const output = execFileSync(
    path.join(BACKEND_DIR, "venv", "Scripts", "python.exe"),
    [path.join(BACKEND_DIR, "scripts", "count_player_rows.py"), process.env.E2E_DB_PATH!, ...playerIds],
    { cwd: BACKEND_DIR, encoding: "utf-8" }
  );
  return JSON.parse(output) as RowCounts;
}

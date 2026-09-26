import { test, expect, createPlayer, uniqueName, navTab } from "./fixtures";
import { API_URL, pinHeader, seedPlayer, seedPin, openParentAreaFromMe, unlockParentArea, parentTab } from "./api";
import type { Page } from "@playwright/test";

const PIN = "5160";
const QUESTION = "Why do I feel sad sometimes?";

async function selectChild(page: Page, nickname: string) {
  const loaded = page.waitForResponse((r) => /\/diary\?limit=/.test(r.url()));
  await page.getByRole("button", { name: nickname }).click();
  expect((await loaded).status()).toBe(200);
}

test("diary entries and Ask Emo questions reach the parent and can be deleted", async ({ page, request }) => {
  await seedPin(request, PIN);
  const other = await seedPlayer(request, uniqueName("E2E Sibling"), "avatar-2");
  const nickname = uniqueName("E2E Writer");
  const note = `E2E note ${Date.now()}: a quiet test day`;

  // Diary through the check-in
  await createPlayer(page, nickname, "Koala");
  const playerId = (await page.evaluate(() => localStorage.getItem("emolearn_player_id")))!;
  await page.getByRole("button", { name: "sad", exact: true }).click();
  await page.getByRole("button", { name: "Continue →" }).click();
  for (const chip of ["School", "Friends"]) {
    const button = page.getByRole("button", { name: chip, exact: true });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
  }
  await page.getByRole("button", { name: "A lot", exact: true }).click();
  await page.getByLabel("Tell me more (you can skip!)").fill(note);
  const saved = page.waitForResponse((r) => r.url().endsWith(`/players/${playerId}/diary`) && r.request().method() === "POST");
  await page.getByRole("button", { name: "Save" }).click();
  const entry = await (await saved).json();
  expect(entry).toMatchObject({ emotion: "sad", intensity: "lot", reason_tags: ["school", "friends"], note });
  await expect(page.getByRole("status")).toHaveText(entry.bot_reply);

  // Ask Emo
  await navTab(page, "Learn").click();
  await page.getByRole("button", { name: /Ask Emo/ }).click();
  await page.getByLabel("Type your question").fill(QUESTION);
  const asked = page.waitForResponse((r) => r.url().endsWith("/buddy/ask"));
  await page.getByRole("button", { name: "Send" }).click();
  const answer = await (await asked).json();
  const chat = page.getByRole("log", { name: "Chat with Emo" });
  await expect(chat).toContainText(QUESTION);
  await expect(chat).toContainText(answer.answer);

  // Parent review, under the right child only
  await openParentAreaFromMe(page, PIN);
  await parentTab(page, "Diary");
  await selectChild(page, nickname);
  await expect(page.getByText(note)).toBeVisible();
  await expect(page.getByText(QUESTION)).toBeVisible();

  await selectChild(page, other.nickname);
  await expect(page.getByText(/No diary entries yet/)).toBeVisible();
  await expect(page.getByText(note)).toHaveCount(0);
  await expect(page.getByText(QUESTION)).toHaveCount(0);

  // Delete both
  await selectChild(page, nickname);
  await page.getByRole("button", { name: "Delete this diary entry" }).click();
  const entryDeleted = page.waitForResponse((r) => r.url().endsWith(`/diary/${entry.id}`) && r.request().method() === "DELETE");
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  expect((await entryDeleted).status()).toBe(204);
  await expect(page.getByText(note)).toHaveCount(0);

  await page.getByRole("button", { name: "Delete this question" }).click();
  const questionDeleted = page.waitForResponse((r) => /\/buddy\/messages\/\d+$/.test(r.url()) && r.request().method() === "DELETE");
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  expect((await questionDeleted).status()).toBe(204);
  await expect(page.getByText(QUESTION)).toHaveCount(0);

  // Still gone after a refresh
  await page.reload();
  await unlockParentArea(page, PIN);
  await expect(page.getByRole("heading", { name: "Diary 📔" })).toBeVisible();
  await selectChild(page, nickname);
  await expect(page.getByText(/No diary entries yet/)).toBeVisible();
  await expect(page.getByText(note)).toHaveCount(0);
  await expect(page.getByText(QUESTION)).toHaveCount(0);

  const diary = await (await request.get(`${API_URL}/players/${playerId}/diary`, { headers: pinHeader(PIN) })).json();
  const questions = await (await request.get(`${API_URL}/players/${playerId}/buddy/messages`, { headers: pinHeader(PIN) })).json();
  expect(diary).toEqual([]);
  expect(questions).toEqual([]);
});

import { test, expect, uniqueName, navTab } from "./fixtures";
import { API_URL, pinHeader, seedPlayer, seedPin, seedGame, seedFeeling, seedDiary, seedQuestion, openParentAreaFromMe, parentTab, countPlayerRows } from "./api";
import type { Page } from "@playwright/test";

const PIN = "7391";

const childCard = (page: Page, nickname: string) =>
  page.getByText(nickname, { exact: true }).locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]");

test("deleting a player removes all their data and nothing else", async ({ page, request }) => {
  await seedPin(request, PIN);
  const doomed = await seedPlayer(request, uniqueName("E2E Leaving"), "avatar-4");
  const keeper = await seedPlayer(request, uniqueName("E2E Staying"), "avatar-5");
  await seedGame(request, doomed.id, ["happy", "sad"]);
  await seedGame(request, doomed.id, ["angry"], { finish: false });
  await seedFeeling(request, doomed.id, "happy");
  await seedDiary(request, doomed.id, "E2E diary note to delete");
  await seedQuestion(request, doomed.id, "Why do I feel happy?");
  await seedGame(request, keeper.id, ["surprised"]);
  await seedDiary(request, keeper.id, "E2E diary note to keep");

  const before = countPlayerRows(doomed.id, keeper.id);
  expect(before.dangling_foreign_keys).toBe(0);
  const doomedBefore = before.players[doomed.id];
  expect(doomedBefore).toMatchObject({ players: 1, sessions: 2, rounds: 5, player_badges: 1, dictionary_progress: 1, diary_entries: 1, buddy_messages: 1 });

  // The player to delete is the one remembered on this device
  await page.goto("/");
  await page.getByRole("button", { name: doomed.nickname }).click();
  await expect(page.getByRole("button", { name: "Choose a feeling!" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("emolearn_player_id"))).toBe(doomed.id);

  await openParentAreaFromMe(page, PIN);
  await parentTab(page, "Children");
  const card = childCard(page, doomed.nickname);

  // Cancel changes nothing
  await card.getByRole("button", { name: "Delete" }).click();
  await expect(card.getByText(/This can't be undone/)).toBeVisible();
  await card.getByRole("button", { name: "Cancel" }).click();
  await expect(card.getByText(/This can't be undone/)).toHaveCount(0);
  expect(countPlayerRows(doomed.id, keeper.id)).toEqual(before);

  // Confirm
  await card.getByRole("button", { name: "Delete" }).click();
  const deleted = page.waitForResponse((r) => r.url().endsWith(`/players/${doomed.id}`) && r.request().method() === "DELETE");
  await card.getByRole("button", { name: "Delete" }).click();
  expect((await deleted).status()).toBe(204);
  await expect(page.getByText(doomed.nickname, { exact: true })).toHaveCount(0);
  await expect(childCard(page, keeper.nickname)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("emolearn_player_id"))).toBeNull();

  // Gone from Welcome
  await page.getByRole("button", { name: "Back to Game" }).click();
  await expect(page.getByRole("button", { name: keeper.nickname })).toBeVisible();
  await expect(page.getByRole("button", { name: doomed.nickname })).toHaveCount(0);

  // Gone from the API
  for (const suffix of ["", "/profile", "/sessions", "/badges", "/dictionary"]) {
    expect((await request.get(`${API_URL}/players/${doomed.id}${suffix}`)).status(), suffix).toBe(404);
  }
  for (const suffix of ["/diary", "/buddy/messages"]) {
    expect((await request.get(`${API_URL}/players/${doomed.id}${suffix}`, { headers: pinHeader(PIN) })).status(), suffix).toBe(404);
  }

  // No rows left anywhere, and the other player is untouched
  const after = countPlayerRows(doomed.id, keeper.id);
  expect(after.dangling_foreign_keys).toBe(0);
  expect(Object.values(after.players[doomed.id]).every((n) => n === 0)).toBe(true);
  expect(Object.keys(after.players[doomed.id]).sort()).toEqual(Object.keys(doomedBefore).sort());
  expect(after.players[keeper.id]).toEqual(before.players[keeper.id]);

  const keeperProfile = await (await request.get(`${API_URL}/players/${keeper.id}/profile`)).json();
  expect(keeperProfile).toMatchObject({ sessions_played: 1, total_stars: 1 });
  const keeperDiary = await (await request.get(`${API_URL}/players/${keeper.id}/diary`, { headers: pinHeader(PIN) })).json();
  expect(keeperDiary.map((e: { note: string }) => e.note)).toEqual(["E2E diary note to keep"]);

  // The keeper can still play
  await page.getByRole("button", { name: keeper.nickname }).click();
  await expect(navTab(page, "Play")).toBeVisible();
});

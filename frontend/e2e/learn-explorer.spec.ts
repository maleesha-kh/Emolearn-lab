import { test, expect, createPlayer, uniqueName, closeBadgePopups, navTab, type Emotion } from "./fixtures";
import type { Page } from "@playwright/test";

const FEELINGS: [Emotion, string][] = [["happy", "Happy"], ["sad", "Sad"], ["angry", "Angry"], ["surprised", "Surprised"]];
const API_URL = "http://127.0.0.1:8001";

const section = (page: Page, title: string) => page.locator("section").filter({ has: page.getByRole("heading", { name: title }) });
const progress = (page: Page) => page.getByText(/things done/);

/** Everything but the last part: every face and body clue, then both facts. */
async function exploreAllButAction(page: Page) {
  const clues = section(page, "Spot the clues 🔍");
  for (const tab of [/Face/, /Body/]) {
    await clues.getByRole("tab", { name: tab }).click();
    const unticked = clues.getByRole("button", { pressed: false });
    while ((await unticked.count()) > 0) await unticked.first().click();
  }
  const facts = page.getByRole("button", { name: "Did you know? Tap to flip" });
  while ((await facts.count()) > 0) await facts.first().click();
  await expect(progress(page)).toHaveText("⭐ 3 of 4 things done");
}

function tryAnAction(page: Page) {
  return section(page, "What can I do?").getByRole("button").first().click();
}

test("exploring all four feelings earns Feelings Explorer once", async ({ page }) => {
  const completeCalls: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && /\/dictionary\/\w+\/complete$/.test(req.url())) completeCalls.push(req.url());
  });

  await createPlayer(page, uniqueName("E2E Learner"), "Bunny");
  await navTab(page, "Learn").click();

  for (const [i, [emotion, label]] of FEELINGS.entries()) {
    await page.getByRole("button", { name: `Learn about ${label}`, exact: true }).click();
    await expect(progress(page)).toHaveText("⭐ 0 of 4 things done");

    // No sticker and no save until every part is done
    await exploreAllButAction(page);
    expect(completeCalls).toHaveLength(i);
    await expect(page.getByText("New sticker! 🎉")).toHaveCount(0);

    const completed = page.waitForResponse((r) => r.url().endsWith(`/dictionary/${emotion}/complete`));
    await tryAnAction(page);
    const body = await (await completed).json();
    expect(body.newly_completed).toBe(true);
    expect(body.new_badges).toEqual(i === FEELINGS.length - 1 ? ["feelings-explorer"] : []);
    expect(completeCalls).toHaveLength(i + 1);

    await expect(progress(page)).toHaveText("🌟 All 4 things done!");
    await expect(page.getByText("New sticker! 🎉")).toBeVisible();
    await page.getByRole("button", { name: /Yay/ }).click();
    await expect(page.getByText("New sticker! 🎉")).toHaveCount(0);

    if (i === FEELINGS.length - 1) {
      const [popup] = await closeBadgePopups(page, 1);
      expect(popup).toContain("Feelings Explorer");
    }
    await page.getByRole("button", { name: "← All feelings" }).click();
    await expect(page.getByRole("button", { name: `Learn about ${label} (explored)` })).toBeVisible();
  }

  // The badge survives a refresh
  await page.reload();
  await navTab(page, "Badges").click();
  await expect(page.getByText("Feelings Explorer", { exact: true }).locator("..")).toContainText("Earned");

  // Exploring again: "again" message, no second badge
  await navTab(page, "Learn").click();
  await page.getByRole("button", { name: "Learn about Happy (explored)" }).click();
  await exploreAllButAction(page);
  const again = page.waitForResponse((r) => r.url().endsWith("/dictionary/happy/complete"));
  await tryAnAction(page);
  const body = await (await again).json();
  expect(body.newly_completed).toBe(false);
  expect(body.new_badges).toEqual([]);
  await expect(page.getByRole("status")).toHaveText("You explored this feeling again! ⭐");
  await expect(page.getByText("New sticker! 🎉")).toHaveCount(0);

  const playerId = await page.evaluate(() => localStorage.getItem("emolearn_player_id"));
  const badges = (await (await page.request.get(`${API_URL}/players/${playerId}/badges`)).json()) as { badge_id: string }[];
  expect(badges.filter((b) => b.badge_id === "feelings-explorer")).toHaveLength(1);
});

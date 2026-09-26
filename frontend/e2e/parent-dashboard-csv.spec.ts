import { readFileSync } from "node:fs";
import { test, expect, uniqueName } from "./fixtures";
import { seedPlayer, seedPin, seedGame, seedFeeling, unlockParentArea, parentTab } from "./api";
import type { Page } from "@playwright/test";

const PIN = "4826";

const statCard = (page: Page, label: string) => page.getByText(label, { exact: true }).locator("xpath=following-sibling::div[1]");
// Recharts draws the labels once the bars have finished animating
const accuracyLabels = (page: Page) => page.locator(".recharts-label-list text");
const historyRows = (page: Page) => page.getByRole("heading", { name: "Session History" }).locator("xpath=ancestor::div[1]/following-sibling::*//tbody/tr");

async function selectChild(page: Page, nickname: string) {
  const loaded = page.waitForResponse((r) => r.url().endsWith("/dashboard"));
  const button = page.getByRole("button", { name: nickname });
  await button.click();
  expect((await loaded).status()).toBe(200);
  await expect(button).toHaveAttribute("aria-pressed", "true");
}

function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

test("parent dashboard and CSV show only the chosen child's finished games", async ({ page, request }) => {
  const child1 = await seedPlayer(request, uniqueName("E2E Alpha"), "avatar-2");
  const child2 = await seedPlayer(request, uniqueName("E2E Beta"), "avatar-3");
  await seedPin(request, PIN);
  await seedGame(request, child1.id, ["happy", "sad"], { mood: "happy" });
  await seedGame(request, child1.id, ["happy", "angry"], { mood: "sad" });
  await seedGame(request, child1.id, ["happy", "sad", "angry", "surprised"], { finish: false });
  await seedFeeling(request, child1.id, "happy");
  await seedFeeling(request, child1.id, "sad");
  await seedGame(request, child2.id, ["surprised"]);

  await page.goto("/");
  await page.getByRole("button", { name: /Manage players/ }).click();
  await unlockParentArea(page, PIN);
  await parentTab(page, "Overview");

  // Child 1: two finished games only
  await selectChild(page, child1.nickname);
  await expect(statCard(page, "Total Sessions")).toHaveText("2");
  await expect(statCard(page, "Average Score")).toHaveText("2/4");
  await expect(statCard(page, "Feelings Explored")).toHaveText("2/4 📖");
  await expect(accuracyLabels(page)).toHaveText(["100%", "50%", "50%", "0%"]);
  await expect(page.getByRole("img", { name: "Emotion accuracy: Happy 100%, Sad 50%, Angry 50%, Surprised 0%" })).toBeVisible();
  await expect(historyRows(page)).toHaveCount(2);

  // CSV for child 1
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download Report CSV/ }).click();
  const download = await downloaded;
  const safeNickname = child1.nickname.replace(/[^A-Za-z0-9_-]/g, "");
  expect(download.suggestedFilename()).toBe(`emolearn_${safeNickname}_${localDate()}.csv`);

  const bytes = readFileSync(await download.path());
  expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  const lines = bytes.subarray(3).toString("utf-8").trim().split(/\r?\n/);
  expect(lines[0]).toBe("Date,Time,Mood,Score,Stars,Happy,Sad,Angry,Surprised");
  const rows = lines.slice(1).map((line) => line.split(","));
  expect(rows).toHaveLength(2);
  for (const row of rows) {
    expect(row[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(row[1]).toMatch(/^\d{2}:\d{2}$/);
  }
  expect(`${rows[0][0]} ${rows[0][1]}` <= `${rows[1][0]} ${rows[1][1]}`).toBe(true);
  expect(rows[0].slice(2)).toEqual(["happy", "2", "2", "Correct", "Correct", "Wrong", "Wrong"]);
  expect(rows[1].slice(2)).toEqual(["sad", "2", "2", "Correct", "Wrong", "Correct", "Wrong"]);

  // Child 2: only their own game
  await selectChild(page, child2.nickname);
  await expect(statCard(page, "Total Sessions")).toHaveText("1");
  await expect(statCard(page, "Average Score")).toHaveText("1/4");
  await expect(statCard(page, "Feelings Explored")).toHaveText("0/4 📖");
  await expect(accuracyLabels(page)).toHaveText(["0%", "0%", "0%", "100%"]);
  await expect(historyRows(page)).toHaveCount(1);

  // Labels stay readable on a phone: inside the screen and not overlapping
  await page.setViewportSize({ width: 375, height: 812 });
  await selectChild(page, child1.nickname);
  await expect(accuracyLabels(page)).toHaveText(["100%", "50%", "50%", "0%"]);
  const chart = page.getByRole("img", { name: /^Emotion accuracy:/ });
  await chart.scrollIntoViewIfNeeded();
  const boxes = await accuracyLabels(page).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON() as DOMRect));
  for (const [i, box] of boxes.entries()) {
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(375);
    if (i > 0) expect(box.left).toBeGreaterThan(boxes[i - 1].right);
  }
  await chart.screenshot({ path: test.info().outputPath("accuracy-375.png") });
});

import { test, expect, createPlayer, uniqueName, answerRound, leaveResult, closeBadgePopups, readProfile, navTab, isPost, type Emotion } from "./fixtures";

// The child's planned answers; the AI's prediction never changes the score
const PLAN = [true, false, true, false];
const EXPECTED_SCORE = PLAN.filter(Boolean).length;

test("new player plays a first game and earns First Star", async ({ page }) => {
  const nickname = uniqueName("E2E Kid");
  await createPlayer(page, nickname, "Fox");

  await page.getByRole("button", { name: "happy", exact: true }).click();
  await page.getByRole("button", { name: "Continue →" }).click();
  await page.getByRole("button", { name: "Skip" }).click();

  await expect(page.getByText("You feel HAPPY today! 🎉")).toBeVisible();
  const ready = page.getByRole("button", { name: /more activit|I'm ready to play/ });
  for (const activity of ["Do a happy wiggle dance!", "Smile as wide as you can!", "Give yourself a big hug!"]) {
    await expect(ready).toBeDisabled();
    await page.getByRole("button", { name: activity }).click();
    await page.getByRole("button", { name: "happy option 1" }).click();
  }
  await expect(page.getByText("3/3 activities done")).toBeVisible();
  await expect(ready).toHaveText(/I'm ready to play/);
  await expect(ready).toBeEnabled();

  const sessionStarted = page.waitForResponse(isPost(/\/sessions$/));
  await ready.click();
  expect((await sessionStarted).ok()).toBe(true);
  await page.getByRole("button", { name: /Start the Game/ }).click();

  const results: { target: Emotion; correct: boolean }[] = [];
  let score = 0;
  for (let i = 0; i < PLAN.length; i++) {
    const round = await answerRound(page, i + 1, PLAN[i], score);
    score = round.score;
    results.push({ target: round.target, correct: PLAN[i] });
    await leaveResult(page, i + 1, PLAN[i]);
  }
  expect(score).toBe(EXPECTED_SCORE);
  expect(new Set(results.map((r) => r.target)).size).toBe(4);

  // Summary
  await expect(page.getByText(`Amazing job, ${nickname}! 🎉`)).toBeVisible();
  const summaryStars = page.getByText(/^Amazing job/).locator("xpath=following-sibling::div[1]").locator("span");
  await expect(summaryStars).toHaveCount(4);
  await expect(summaryStars.filter({ hasText: "⭐" })).toHaveCount(EXPECTED_SCORE);
  for (const { target, correct } of results) {
    const row = page.getByText(new RegExp(`^${target.toUpperCase()} `)).locator("..");
    await expect(row).toContainText(correct ? "1/1" : "0/1");
  }

  const [popup] = await closeBadgePopups(page, 1);
  expect(popup).toContain("First Star");

  // Me: one finished session with the child's stars
  const profile = await readProfile(page);
  expect(profile.sessions).toBe(1);
  expect(profile.stars).toBe(EXPECTED_SCORE);

  await navTab(page, "Badges").click();
  await expect(page.getByText("First Star", { exact: true }).locator("..")).toContainText("Earned");
});

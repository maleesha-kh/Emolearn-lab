import { test, expect, createPlayer, uniqueName } from "./fixtures";
import type { Page } from "@playwright/test";

const EMOTIONS = ["happy", "sad", "angry", "surprised"] as const;
type Emotion = (typeof EMOTIONS)[number];

// The child's planned answers; the AI's prediction never changes the score
const PLAN = [true, false, true, false];
const EXPECTED_SCORE = PLAN.filter(Boolean).length;

async function currentTarget(page: Page): Promise<Emotion> {
  const bubble = await page.getByText(/^Find the .+ character!/).textContent();
  const target = bubble?.match(/Find the (\w+) character!/)?.[1]?.toLowerCase();
  expect(EMOTIONS).toContain(target);
  return target as Emotion;
}

async function cardEmotions(page: Page): Promise<Emotion[]> {
  const alts = await page.locator("button.emotion-card img").evaluateAll((imgs) => imgs.map((img) => img.getAttribute("alt")));
  return alts.map((alt) => alt!.replace(" character", "") as Emotion);
}

async function playRound(page: Page, roundNo: number, correct: boolean, scoreBefore: number) {
  await expect(page.getByText(`Round ${roundNo} of 4`)).toBeVisible();
  const target = await currentTarget(page);
  const options = await cardEmotions(page);
  expect(options).toHaveLength(3);
  expect(options.filter((o) => o === target)).toHaveLength(1);
  const pick = correct ? target : options.find((o) => o !== target)!;

  const card = page.getByRole("button", { name: `${pick} character`, exact: true });
  await card.click();
  await expect(card).toHaveAttribute("aria-pressed", "true");

  const predicted = page.waitForResponse((r) => r.url().endsWith("/predict"));
  await page.getByRole("button", { name: /Tell the AI/ }).click();
  expect((await predicted).status()).toBe(200);

  const score = scoreBefore + (correct ? 1 : 0);
  if (correct) {
    await expect(page.getByText("✅ CORRECT! ⭐ Amazing teaching!")).toBeVisible();
  } else {
    await expect(page.getByText("💛 Good try! Let us learn together!")).toBeVisible();
    await expect(page.getByText(new RegExp(`The ${target.toUpperCase()} .* character was this one!`))).toBeVisible();
  }
  await expect(page.getByText(`⭐ ${score}/4`)).toBeVisible();

  const next = page.getByRole("button", { name: roundNo === 4 ? /See My Results/ : /Next Round/ });
  await expect(next).toBeEnabled();
  await next.click();

  await expect(page.getByText(correct ? "+1 Star! ⭐" : "Keep going! 💜")).toBeVisible();
  return { target, score };
}

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

  const sessionStarted = page.waitForResponse((r) => r.url().endsWith("/sessions") && r.request().method() === "POST");
  await ready.click();
  expect((await sessionStarted).ok()).toBe(true);
  await page.getByRole("button", { name: /Start the Game/ }).click();

  const results: { target: Emotion; correct: boolean }[] = [];
  let score = 0;
  for (let i = 0; i < PLAN.length; i++) {
    const round = await playRound(page, i + 1, PLAN[i], score);
    score = round.score;
    results.push({ target: round.target, correct: PLAN[i] });

    const isLast = i === PLAN.length - 1;
    const finished = isLast ? page.waitForResponse((r) => /\/sessions\/[^/]+\/finish$/.test(r.url())) : null;
    await page.getByRole("button", { name: "Continue →" }).click();
    if (finished) expect((await finished).status()).toBe(200);
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

  // Badge popup
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("First Star");
  await dialog.getByRole("button", { name: /Nice/ }).click();
  await expect(dialog).toBeHidden();

  // Me: one finished session with the child's stars
  const profile = page.waitForResponse((r) => r.url().endsWith("/profile"));
  await page.getByRole("button", { name: /Me$/ }).click();
  expect((await profile).status()).toBe(200);
  await expect(page.getByText(`Learning Stars ⭐ ${EXPECTED_SCORE} total`)).toBeVisible();
  await expect(page.getByText("Sessions Played").locator("xpath=following-sibling::div[1]")).toHaveText("1");

  // Badges
  await page.getByRole("button", { name: /Badges$/ }).click();
  const badge = page.getByText("First Star", { exact: true }).locator("..");
  await expect(badge).toContainText("Earned");
});

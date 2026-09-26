import { test as base, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BACKEND_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "backend");
const PYTHON = path.join(BACKEND_DIR, "venv", "Scripts", "python.exe");
const RESET_SCRIPT = path.join(BACKEND_DIR, "scripts", "reset_test_db.py");

export const EMOTIONS = ["happy", "sad", "angry", "surprised"] as const;
export type Emotion = (typeof EMOTIONS)[number];

function resetTestDb() {
  const dbPath = process.env.E2E_DB_PATH;
  if (!dbPath) throw new Error("E2E_DB_PATH is not set; run through playwright.config.ts");
  // The script refuses anything outside backend/data/e2e/ and exits non-zero
  execFileSync(PYTHON, [RESET_SCRIPT, dbPath], { cwd: BACKEND_DIR, stdio: "pipe" });
}

// Every test starts from an empty database; each test already gets a fresh
// browser context, so its storage starts empty too.
export const test = base.extend<{ cleanDb: void }>({
  cleanDb: [
    async ({}, use) => {
      resetTestDb();
      await use();
    },
    { auto: true },
  ],
});

export { expect };

export function uniqueName(prefix: string) {
  return `${prefix} ${process.env.E2E_RUN_ID!.slice(-4)}${Math.floor(Math.random() * 1000)}`;
}

/** A bottom navigation tab: Mood, Play, Me, Learn or Badges. */
export function navTab(page: Page, label: string) {
  return page.getByRole("button", { name: new RegExp(`^\\S+ ${label}$`) });
}

export const isPost = (pattern: RegExp) => (r: { url(): string; request(): { method(): string } }) =>
  pattern.test(r.url()) && r.request().method() === "POST";

/** Creates a player on the Welcome screen and lands on the mood check-in. */
export async function createPlayer(page: Page, nickname: string, avatar: string) {
  await page.goto("/");
  await page.getByRole("button", { name: /New Player/ }).click();
  await page.getByPlaceholder("Type a nickname...").fill(nickname);

  const avatarButton = page.getByRole("button", { name: `Avatar: ${avatar}` });
  await avatarButton.click();
  await expect(avatarButton).toHaveAttribute("aria-pressed", "true");

  const created = page.waitForResponse(isPost(/\/players$/));
  await page.getByRole("button", { name: /Let's Play/ }).click();
  expect((await created).ok()).toBe(true);
  await expect(page.getByRole("button", { name: "Choose a feeling!" })).toBeVisible();
}

/** Starts a game from the Play tab (no mood check-in) and opens round 1. */
export async function startGameFromPlayTab(page: Page) {
  const started = page.waitForResponse(isPost(/\/sessions$/));
  await navTab(page, "Play").click();
  expect((await started).ok()).toBe(true);
  await page.getByRole("button", { name: /Start the Game/ }).click();
  await expect(page.getByText("Round 1 of 4")).toBeVisible();
}

export async function currentTarget(page: Page): Promise<Emotion> {
  const bubble = await page.getByText(/^Find the .+ character!/).textContent();
  const target = bubble?.match(/Find the (\w+) character!/)?.[1]?.toLowerCase();
  expect(EMOTIONS).toContain(target);
  return target as Emotion;
}

/** The cards in on-screen order, as shuffled for this game. */
export async function roundCards(page: Page): Promise<{ emotion: Emotion; src: string }[]> {
  return page.locator("button.emotion-card img").evaluateAll((imgs) =>
    imgs.map((img) => ({ emotion: img.getAttribute("alt")!.replace(" character", "") as Emotion, src: img.getAttribute("src")! }))
  );
}

/** Picks a card following the target on screen, waits for the real /predict, and stops on the result screen. */
export async function answerRound(page: Page, roundNo: number, correct: boolean | ((target: Emotion) => boolean), scoreBefore: number) {
  await expect(page.getByText(`Round ${roundNo} of 4`)).toBeVisible();
  const target = await currentTarget(page);
  const cards = await roundCards(page);
  expect(cards).toHaveLength(3);
  expect(cards.filter((c) => c.emotion === target)).toHaveLength(1);

  const isCorrect = typeof correct === "function" ? correct(target) : correct;
  const picked = isCorrect ? cards.find((c) => c.emotion === target)! : cards.find((c) => c.emotion !== target)!;
  const card = page.getByRole("button", { name: `${picked.emotion} character`, exact: true });
  await card.click();
  await expect(card).toHaveAttribute("aria-pressed", "true");

  const predicted = page.waitForResponse((r) => r.url().endsWith("/predict"));
  await page.getByRole("button", { name: /Tell the AI/ }).click();
  expect((await predicted).status()).toBe(200);

  const score = scoreBefore + (isCorrect ? 1 : 0);
  if (isCorrect) {
    await expect(page.getByText("✅ CORRECT! ⭐ Amazing teaching!")).toBeVisible();
  } else {
    await expect(page.getByText("💛 Good try! Let us learn together!")).toBeVisible();
    await expect(page.getByText(new RegExp(`The ${target.toUpperCase()} .* character was this one!`))).toBeVisible();
  }
  await expect(page.getByText(`⭐ ${score}/4`)).toBeVisible();
  return { target, correct: isCorrect, score, picked };
}

/** From the result screen, through the transition screen, to the next round or the summary. */
export async function leaveResult(page: Page, roundNo: number, correct: boolean) {
  const next = page.getByRole("button", { name: roundNo === 4 ? /See My Results/ : /Next Round/ });
  await expect(next).toBeEnabled();
  await next.click();
  await expect(page.getByText(correct ? "+1 Star! ⭐" : "Keep going! 💜")).toBeVisible();

  const finished = roundNo === 4 ? page.waitForResponse((r) => /\/sessions\/[^/]+\/finish$/.test(r.url())) : null;
  await page.getByRole("button", { name: "Continue →" }).click();
  if (!finished) return null;
  const response = await finished;
  expect(response.status()).toBe(200);
  return ((await response.json()) as { new_badges: string[] }).new_badges;
}

/** Plays rounds from `fromRound` to the end of the game, deciding each answer from the target. */
export async function playRest(page: Page, correctFor: (target: Emotion) => boolean, fromRound = 1, scoreBefore = 0) {
  const results: { target: Emotion; correct: boolean }[] = [];
  let score = scoreBefore;
  let newBadges: string[] = [];
  for (let roundNo = fromRound; roundNo <= 4; roundNo++) {
    const round = await answerRound(page, roundNo, correctFor, score);
    score = round.score;
    results.push({ target: round.target, correct: round.correct });
    newBadges = (await leaveResult(page, roundNo, round.correct)) ?? newBadges;
  }
  await expect(page.getByText(/^Amazing job, .+! 🎉$/)).toBeVisible();
  return { results, score, newBadges };
}

/** Closes badge popups until none is left, returning their text. */
export async function closeBadgePopups(page: Page, expected: number) {
  const texts: string[] = [];
  const dialog = page.getByRole("dialog");
  for (let i = 0; i < expected; i++) {
    await expect(dialog).toBeVisible();
    texts.push((await dialog.textContent()) ?? "");
    await dialog.getByRole("button", { name: /Nice/ }).click();
  }
  await expect(dialog).toBeHidden();
  return texts;
}

/** Opens Me and reads its totals once the profile has loaded. */
export async function readProfile(page: Page) {
  const loaded = page.waitForResponse((r) => r.url().endsWith("/profile"));
  await navTab(page, "Me").click();
  expect((await loaded).status()).toBe(200);
  const starsText = await page.getByText(/^Learning Stars ⭐ \d+ total$/).textContent();
  const sessionsBox = page.getByText("Sessions Played").locator("xpath=following-sibling::div[1]");
  const sessions = Number(await sessionsBox.textContent());
  const scores: Partial<Record<Emotion, string>> = {};
  if (sessions > 0) {
    const cards = await page.getByText("My Emotion Scores").locator("xpath=following-sibling::div[1]/div").allTextContents();
    for (const text of cards) {
      const emotion = EMOTIONS.find((e) => text.toLowerCase().startsWith(e));
      if (emotion) scores[emotion] = text.replace(/^\D+/, "").trim() || text;
    }
  }
  return { sessions, stars: Number(starsText!.match(/\d+/)![0]), scores };
}

export async function enterPin(page: Page, pin: string) {
  for (const digit of pin) {
    const key = page.getByRole("button", { name: digit, exact: true });
    await expect(key).toBeEnabled();
    await key.click();
  }
}

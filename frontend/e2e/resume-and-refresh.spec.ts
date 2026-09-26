import { test, expect, createPlayer, uniqueName, startGameFromPlayTab, answerRound, leaveResult, playRest, roundCards, closeBadgePopups, readProfile, navTab, isPost } from "./fixtures";

test("leaving mid-game resumes the same game; refreshing starts a new one", async ({ page }) => {
  const sessionsStarted: string[] = [];
  const roundsSaved: number[] = [];
  page.on("request", (req) => {
    if (req.method() !== "POST") return;
    if (/\/sessions$/.test(req.url())) sessionsStarted.push(req.url());
    if (/\/sessions\/[^/]+\/rounds$/.test(req.url())) roundsSaved.push(req.postDataJSON().round_no);
  });

  await createPlayer(page, uniqueName("E2E Resume"), "Cat");
  await startGameFromPlayTab(page);

  // Round 1 answered, then away to Me and back through Play: same result screen
  const round1 = await answerRound(page, 1, true, 0);
  await expect(page.locator(`img[src="${round1.picked.src}"]`).first()).toBeVisible();
  await navTab(page, "Me").click();
  await expect(page.getByText("My Profile 👤")).toBeVisible();
  await navTab(page, "Play").click();
  await expect(page.getByText("✅ CORRECT! ⭐ Amazing teaching!")).toBeVisible();
  await expect(page.getByText("⭐ 1/4")).toBeVisible();
  await expect(page.locator(`img[src="${round1.picked.src}"]`).first()).toBeVisible();
  await leaveResult(page, 1, true);

  // Round 2 not yet answered, away to Learn and back: same round, cards and images
  await expect(page.getByText("Round 2 of 4")).toBeVisible();
  const cardsBefore = await roundCards(page);
  await navTab(page, "Learn").click();
  await expect(page.getByText("Pick a feeling 📖")).toBeVisible();
  await navTab(page, "Play").click();
  await expect(page.getByText("Round 2 of 4")).toBeVisible();
  expect(await roundCards(page)).toEqual(cardsBefore);

  // Score carries on from 1: a wrong answer keeps it at 1, no duplicate star
  await answerRound(page, 2, false, 1);
  await leaveResult(page, 2, false);
  const game1 = await playRest(page, () => true, 3, 1);
  expect(game1.score).toBe(3);
  expect(sessionsStarted).toHaveLength(1);
  expect(roundsSaved).toEqual([1, 2, 3, 4]);
  await closeBadgePopups(page, game1.newBadges.length);

  // A second game, refreshed mid-game: back to Play with a brand new game
  await startGameFromPlayTab(page);
  expect(sessionsStarted).toHaveLength(2);
  await answerRound(page, 1, true, 0);

  const restarted = page.waitForResponse(isPost(/\/sessions$/));
  await page.reload();
  expect((await restarted).ok()).toBe(true);
  await expect(page.getByRole("button", { name: /Start the Game/ })).toBeVisible();
  expect(sessionsStarted).toHaveLength(3);
  await page.getByRole("button", { name: /Start the Game/ }).click();
  await expect(page.getByText("Round 1 of 4")).toBeVisible();
  await expect(page.getByText("⭐", { exact: true })).toHaveCount(0);

  // Only the finished game counts on Me
  const profile = await readProfile(page);
  expect(profile.sessions).toBe(1);
  expect(profile.stars).toBe(3);
});

import { test, expect, createPlayer, uniqueName, startGameFromPlayTab, playRest, answerRound, closeBadgePopups, readProfile, type Emotion } from "./fixtures";

const correctOn = (...emotions: Emotion[]) => (target: Emotion) => emotions.includes(target);

const EXPECTED = {
  sessions: 2,
  stars: 4,
  scores: { happy: "2/2", sad: "1/2", angry: "1/2", surprised: "0/2" },
};

test("Me totals add up over games and ignore an unfinished one", async ({ page }) => {
  await createPlayer(page, uniqueName("E2E Totals"), "Koala");

  await startGameFromPlayTab(page);
  const game1 = await playRest(page, correctOn("happy", "sad"));
  expect(game1.score).toBe(2);
  expect(game1.newBadges).toEqual(["first-star"]);
  await closeBadgePopups(page, 1);

  await startGameFromPlayTab(page);
  const game2 = await playRest(page, correctOn("happy", "angry"));
  expect(game2.score).toBe(2);
  expect(game2.newBadges).toEqual([]);

  expect(await readProfile(page)).toEqual(EXPECTED);

  // A third game, one round answered and left unfinished
  await startGameFromPlayTab(page);
  await answerRound(page, 1, true, 0);
  expect(await readProfile(page)).toEqual(EXPECTED);
});

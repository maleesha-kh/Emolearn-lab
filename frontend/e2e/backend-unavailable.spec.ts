import { test, expect, uniqueName, startGameFromPlayTab, answerRound, roundCards, currentTarget } from "./fixtures";
import { API_URL, seedPlayer } from "./api";

test("the app recovers when the backend or the model is unavailable", async ({ page, request }) => {
  const player = await seedPlayer(request, uniqueName("E2E Offline"), "avatar-6");
  const roundsSaved: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && /\/sessions\/[^/]+\/rounds$/.test(req.url())) roundsSaved.push(req.url());
  });

  // Whole backend down
  await page.route(`${API_URL}/**`, (route) => route.abort("connectionrefused"));
  await page.goto("/");
  await expect(page.getByText("Emo can't connect right now 🔌")).toBeVisible();
  await expect(page.getByRole("button", { name: player.nickname })).toHaveCount(0);

  await page.unroute(`${API_URL}/**`);
  const players = page.waitForResponse((r) => r.url().endsWith("/players"));
  await page.getByRole("button", { name: "Try again" }).click();
  expect((await players).status()).toBe(200);
  await page.getByRole("button", { name: player.nickname }).click();
  await startGameFromPlayTab(page);

  // /predict unreachable
  const target = await currentTarget(page);
  const cards = await roundCards(page);
  await page.route(`${API_URL}/predict`, (route) => route.abort("connectionrefused"));
  await page.getByRole("button", { name: `${target} character`, exact: true }).click();
  await page.getByRole("button", { name: /Tell the AI/ }).click();
  await expect(page.getByText("Emo can't hear you right now. Check the internet and try again!")).toBeVisible();

  // Try Again reaches the server, which now fails
  await page.unroute(`${API_URL}/predict`);
  await page.route(`${API_URL}/predict`, (route) => route.fulfill({ status: 500, json: { detail: "E2E forced failure" } }));
  const retried = page.waitForRequest((r) => r.url().endsWith("/predict"));
  await page.getByRole("button", { name: "Try Again" }).click();
  await retried;
  await expect(page.getByText("Emo got a bit confused. Let's try again!")).toBeVisible();

  // Pick Again: same round and cards, nothing selected, nothing saved
  await page.getByRole("button", { name: "Pick Again" }).click();
  await expect(page.getByText("Round 1 of 4")).toBeVisible();
  expect(await roundCards(page)).toEqual(cards);
  await expect(page.getByRole("button", { name: /Tell the AI/ })).toBeDisabled();
  expect(roundsSaved).toHaveLength(0);

  // Model back: the round finishes normally with one star
  await page.unroute(`${API_URL}/predict`);
  const saved = page.waitForResponse((r) => /\/sessions\/[^/]+\/rounds$/.test(r.url()));
  await answerRound(page, 1, true, 0);
  expect((await saved).status()).toBe(201);
  expect(roundsSaved).toHaveLength(1);
  await expect(page.getByText("⭐ 1/4")).toBeVisible();
});

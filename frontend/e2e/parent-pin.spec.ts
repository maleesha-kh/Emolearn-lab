import { test, expect, createPlayer, uniqueName, enterPin } from "./fixtures";
import { seedPlayer, seedPin } from "./api";
import type { Page } from "@playwright/test";

const PIN = "2580";

async function verifyPin(page: Page) {
  await expect(page.getByText("Enter the 4-digit PIN to continue")).toBeVisible();
  const verified = page.waitForResponse((r) => r.url().endsWith("/parent/pin/verify"));
  await enterPin(page, PIN);
  expect((await verified).status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Children 👧" })).toBeVisible();
}

async function allBrowserStorage(page: Page) {
  return page.evaluate(() => {
    const dump = (s: Storage) => Array.from({ length: s.length }, (_, i) => `${s.key(i)}=${s.getItem(s.key(i)!)}`);
    return [...dump(localStorage), ...dump(sessionStorage)].join("\n");
  });
}

test("parent creates a PIN and needs it again to re-enter", async ({ page }) => {
  // "Manage players" only shows once a player exists
  await createPlayer(page, uniqueName("E2E Parent"), "Panda");
  await page.getByTitle("Home").click();
  await page.getByRole("button", { name: /Manage players/ }).click();

  // Create and confirm
  await expect(page.getByText("Choose a 4-digit PIN")).toBeVisible();
  await enterPin(page, PIN);
  await expect(page.getByText("Enter it again to confirm")).toBeVisible();
  const setup = page.waitForResponse((r) => r.url().endsWith("/parent/pin/setup"));
  await enterPin(page, PIN);
  expect((await setup).ok()).toBe(true);

  // Recovery code, shown once
  await expect(page.getByRole("heading", { name: "Save your recovery code" })).toBeVisible();
  const code = (await page.locator("span").filter({ hasText: /^[A-Z0-9]{3,}(-[A-Z0-9]{3,})+$/ }).textContent())!;
  expect(code).toMatch(/^[A-Z0-9]{3,}(-[A-Z0-9]{3,})+$/);

  const continueButton = page.getByRole("button", { name: "Continue" });
  await expect(continueButton).toBeDisabled();
  await page.getByRole("checkbox", { name: "I've saved it" }).check();
  await expect(continueButton).toBeEnabled();
  await continueButton.click();
  await expect(page.getByRole("heading", { name: "Children 👧" })).toBeVisible();

  // Leave and come back: PIN needed again
  await page.getByRole("button", { name: "Back to Game" }).click();
  await page.getByRole("button", { name: /Manage players/ }).click();
  await verifyPin(page);

  // Refresh: PIN needed again
  await page.reload();
  await verifyPin(page);

  const storage = await allBrowserStorage(page);
  expect(storage).not.toContain(PIN);
  expect(storage).not.toContain(code);
  expect(storage).not.toContain(code.replace(/-/g, ""));
});

test("a remembered player's Welcome has a quiet Manage players link to the PIN screen", async ({ page, request }) => {
  const player = await seedPlayer(request, uniqueName("E2E Known"), "avatar-3");
  await seedPin(request, PIN);

  // Pick the player once so they're remembered, then come back to Welcome
  await page.goto("/");
  await page.getByRole("button", { name: player.nickname }).click();
  await expect(page.getByRole("button", { name: "Choose a feeling!" })).toBeVisible();
  await page.reload();
  await page.getByTitle("Home").click();
  await expect(page.getByText(`Hi ${player.nickname}! 👋`)).toBeVisible();

  const notYou = page.getByRole("button", { name: "Not you?" });
  const link = page.getByRole("button", { name: "Manage players", exact: true });

  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await link.scrollIntoViewIfNeeded();
    await expect(link).toBeVisible();
    const box = (await link.boundingBox())!;
    const notYouBox = (await notYou.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(box.height).toBeGreaterThanOrEqual(24);
    expect(box.y).toBeGreaterThanOrEqual(notYouBox.y + notYouBox.height);
    await page.screenshot({ path: test.info().outputPath(`welcome-remembered-${width}.png`) });
  }

  // Reachable by keyboard, straight after "Not you?"
  await notYou.focus();
  await page.keyboard.press("Tab");
  await expect(link).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Parent Access" })).toBeVisible();
  await expect(page.getByText("Enter the 4-digit PIN to continue")).toBeVisible();

  // Back returns to the same Welcome without opening anything
  await page.getByRole("button", { name: "← Back" }).click();
  await expect(page.getByText(`Hi ${player.nickname}! 👋`)).toBeVisible();
  await expect(page.getByRole("button", { name: "Back to Game" })).toHaveCount(0);
});

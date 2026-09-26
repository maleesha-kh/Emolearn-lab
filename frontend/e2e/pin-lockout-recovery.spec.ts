import { test, expect, createPlayer, uniqueName, enterPin, navTab } from "./fixtures";
import type { Page } from "@playwright/test";

const OLD_PIN = "1357";
const NEW_PIN = "2468";
const WRONG_PIN = "0000";
// The fake clock runs a day ahead, so a reading can prove it is still installed
const CLOCK_OFFSET_MS = 24 * 60 * 60 * 1000;

const lockMessage = (page: Page) => page.getByText(/^Too many tries\. Try again in \d+s$/);
const children = (page: Page) => page.getByRole("heading", { name: "Children 👧" });

async function openParentArea(page: Page) {
  await page.getByRole("button", { name: /Manage players/ }).click();
  await expect(page.getByRole("heading", { name: /^(Parent Access|Create Parent PIN)$/ })).toBeVisible();
}

// After a refresh the player is remembered and Welcome no longer lists players,
// so the parent area is reached from the child's Me screen instead
async function openParentAreaFromMe(page: Page) {
  await page.getByRole("button", { name: /Let's Play/ }).click();
  await navTab(page, "Me").click();
  await page.getByTitle("Parent/Teacher").click();
  await expect(page.getByRole("heading", { name: "Parent Access" })).toBeVisible();
}

async function wrongTry(page: Page) {
  const checked = page.waitForResponse((r) => r.url().endsWith("/parent/pin/verify"));
  await enterPin(page, WRONG_PIN);
  expect(await (await checked).json()).toEqual({ valid: false });
  // Boxes clear once the shake is over
  await expect(page.getByText("●")).toHaveCount(0);
}

async function saveRecoveryCode(page: Page) {
  await expect(page.getByRole("heading", { name: "Save your recovery code" })).toBeVisible();
  const code = (await page.locator("span").filter({ hasText: /^[A-Z0-9]{3,}(-[A-Z0-9]{3,})+$/ }).textContent())!;
  const continueButton = page.getByRole("button", { name: "Continue" });
  await expect(continueButton).toBeDisabled();
  await page.getByRole("checkbox", { name: "I've saved it" }).check();
  await continueButton.click();
  await expect(children(page)).toBeVisible();
  return code;
}

async function fillRecovery(page: Page, code: string, pin: string) {
  await page.getByRole("button", { name: "Forgot PIN?" }).click();
  await page.getByLabel("Recovery code").fill(code);
  await page.getByLabel("New PIN", { exact: true }).fill(pin);
  await page.getByLabel("Confirm new PIN").fill(pin);
  const recovered = page.waitForResponse((r) => r.url().endsWith("/parent/pin/recover"));
  await page.getByRole("button", { name: "Reset PIN" }).click();
  return recovered;
}

test("wrong PINs lock the keypad, and recovery replaces the PIN and code", async ({ page }) => {
  await page.clock.install({ time: Date.now() + CLOCK_OFFSET_MS });

  await createPlayer(page, uniqueName("E2E Guardian"), "Dog");
  await page.getByTitle("Home").click();
  await openParentArea(page);
  await enterPin(page, OLD_PIN);
  await enterPin(page, OLD_PIN);
  const oldCode = await saveRecoveryCode(page);
  await page.getByRole("button", { name: "Back to Game" }).click();

  // 4 wrong tries, leave, come back: the 5th still locks
  await openParentArea(page);
  for (let i = 0; i < 4; i++) await wrongTry(page);
  await expect(lockMessage(page)).toHaveCount(0);
  await page.getByRole("button", { name: "← Back" }).click();
  await openParentArea(page);
  await wrongTry(page);
  await expect(lockMessage(page)).toHaveText(/in (29|30)s$/);
  await expect(page.getByRole("button", { name: "1", exact: true })).toBeDisabled();

  // The countdown runs on the fake clock
  await page.clock.fastForward(10_000);
  await expect(lockMessage(page)).toHaveText(/in (19|20)s$/);

  // Leaving keeps the lock
  await page.getByRole("button", { name: "← Back" }).click();
  await openParentArea(page);
  await expect(lockMessage(page)).toBeVisible();

  // Refreshing keeps the lock, and the fake clock is still in charge afterwards
  const fakeNowBefore = await page.evaluate(() => Date.now());
  await page.reload();
  const fakeNowAfter = await page.evaluate(() => Date.now());
  expect(fakeNowAfter).toBeGreaterThanOrEqual(fakeNowBefore);
  expect(fakeNowAfter - Date.now()).toBeGreaterThan(CLOCK_OFFSET_MS / 2);
  await expect(lockMessage(page)).toHaveText(/in (1[5-9]|20)s$/);
  await expect(page.getByRole("button", { name: "1", exact: true })).toBeDisabled();

  await page.clock.fastForward(25_000);
  await expect(lockMessage(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "1", exact: true })).toBeEnabled();

  // Recover with the old code and choose a new PIN
  expect((await fillRecovery(page, oldCode, NEW_PIN)).ok()).toBe(true);
  const newCode = await saveRecoveryCode(page);
  expect(newCode).not.toBe(oldCode);
  await page.getByRole("button", { name: "Back to Game" }).click();

  // The old PIN no longer works
  await openParentAreaFromMe(page);
  const oldPinCheck = page.waitForResponse((r) => r.url().endsWith("/parent/pin/verify"));
  await enterPin(page, OLD_PIN);
  expect(await (await oldPinCheck).json()).toEqual({ valid: false });
  await expect(page.getByText("Incorrect PIN. Try again!")).toBeVisible();
  await expect(page.getByText("●")).toHaveCount(0);

  // Nor does the old recovery code
  expect((await fillRecovery(page, oldCode, "9999")).status()).toBe(403);
  await expect(page.getByText("That recovery code is not right")).toBeVisible();
  await page.getByRole("button", { name: "← Back" }).click();

  // The new PIN does
  const newPinCheck = page.waitForResponse((r) => r.url().endsWith("/parent/pin/verify"));
  await enterPin(page, NEW_PIN);
  expect(await (await newPinCheck).json()).toEqual({ valid: true });
  // Opened from Me, the parent area starts on the overview
  await expect(page.getByRole("heading", { name: "Session Overview 📊" })).toBeVisible();
});

import { test, expect, createPlayer, uniqueName, enterPin } from "./fixtures";
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

import { test as base, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BACKEND_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "backend");
const PYTHON = path.join(BACKEND_DIR, "venv", "Scripts", "python.exe");
const RESET_SCRIPT = path.join(BACKEND_DIR, "scripts", "reset_test_db.py");

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

/** Creates a player on the Welcome screen and lands on the mood check-in. */
export async function createPlayer(page: Page, nickname: string, avatar: string) {
  await page.goto("/");
  await page.getByRole("button", { name: /New Player/ }).click();
  await page.getByPlaceholder("Type a nickname...").fill(nickname);

  const avatarButton = page.getByRole("button", { name: `Avatar: ${avatar}` });
  await avatarButton.click();
  await expect(avatarButton).toHaveAttribute("aria-pressed", "true");

  const created = page.waitForResponse((r) => r.url().endsWith("/players") && r.request().method() === "POST");
  await page.getByRole("button", { name: /Let's Play/ }).click();
  expect((await created).ok()).toBe(true);
  await expect(page.getByRole("button", { name: "Choose a feeling!" })).toBeVisible();
}

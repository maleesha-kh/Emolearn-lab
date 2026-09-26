import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { test, expect, uniqueName, navTab, enterPin, answerRound, leaveResult } from "./fixtures";
import { seedPin, seedPlayer, parentTab } from "./api";
import { runLayoutChecks, type LayoutResult } from "./nfr3-checks";

// NFR3 evidence: screenshots, layout checks and axe results for each screen at
// phone and desktop size. Findings are recorded, not asserted; the test only
// fails if a screen can't be reached. Output goes to NFR3_OUT (or the test's output folder).

const VIEWPORTS = [
  { name: "375x812", width: 375, height: 812 },
  { name: "1280x800", width: 1280, height: 800 },
];
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
const PIN = "6284";

type StateRecord = { n: number; state: string; label: string; child: boolean; url: string; screenshot: string; animationsSettled: boolean };

for (const viewport of VIEWPORTS) {
  test(`NFR3 screens at ${viewport.name}`, async ({ page, request }) => {
    test.setTimeout(300_000);
    const out = process.env.NFR3_OUT ?? test.info().outputPath("nfr3");
    const shotsDir = path.join(out, "screens", viewport.name);
    mkdirSync(shotsDir, { recursive: true });
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    const states: StateRecord[] = [];
    const layout: Record<string, LayoutResult> = {};
    const axe: Record<string, unknown> = {};
    const save = () => {
      writeFileSync(path.join(out, `states-${viewport.name}.json`), JSON.stringify(states, null, 1));
      writeFileSync(path.join(out, `checks-${viewport.name}.json`), JSON.stringify(layout, null, 1));
      writeFileSync(path.join(out, `axe-${viewport.name}.json`), JSON.stringify(axe, null, 1));
    };

    async function capture(state: string, label: string, child: boolean) {
      // Let one-off animations (fade-ins, pop-ins) finish; looping decorations keep going
      const animationsSettled = await page.waitForFunction(() => document.getAnimations().every((a) => {
        const timing = a.effect?.getComputedTiming();
        return timing?.iterations === Infinity || a.playState !== "running";
      }), undefined, { timeout: 8_000 }).then(() => true, () => false);
      const n = states.length + 1;
      const screenshot = `screens/${viewport.name}/${String(n).padStart(2, "0")}-${state}.png`;
      await page.screenshot({ path: path.join(out, screenshot), fullPage: true, animations: "disabled" });
      layout[state] = await page.evaluate(runLayoutChecks);
      const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      axe[state] = {
        violations: results.violations.map((v) => ({
          id: v.id, impact: v.impact, tags: v.tags, help: v.help, helpUrl: v.helpUrl,
          nodes: v.nodes.map((node) => ({ target: node.target, html: node.html.slice(0, 200), data: node.any[0]?.data ?? null, summary: node.failureSummary })),
        })),
        incomplete: results.incomplete.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
        passes: results.passes.length,
        engine: results.testEngine.version,
      };
      states.push({ n, state, label, child, url: page.url(), screenshot, animationsSettled });
      save();
    }

    await seedPin(request, PIN);
    const sibling = await seedPlayer(request, uniqueName("NFR3 Sibling"), "avatar-2");
    const nickname = uniqueName("NFR3 Kid");

    // Welcome with the player list
    await page.goto("/");
    await expect(page.getByRole("button", { name: sibling.nickname })).toBeVisible();
    await capture("welcome", "Welcome (player list)", true);

    await page.getByRole("button", { name: /New Player/ }).click();
    await page.getByPlaceholder("Type a nickname...").fill(nickname);
    await page.getByRole("button", { name: "Avatar: Fox" }).click();
    await page.getByRole("button", { name: /Let's Play/ }).click();
    await expect(page.getByRole("button", { name: "Choose a feeling!" })).toBeVisible();
    await page.getByRole("button", { name: "happy", exact: true }).click();
    await capture("mood-selection", "Mood check-in (a feeling selected)", true);

    await page.getByRole("button", { name: "Continue →" }).click();
    await expect(page.getByLabel("Tell me more (you can skip!)")).toBeVisible();
    await capture("diary", "Diary", true);
    await page.getByRole("button", { name: "Skip" }).click();

    await expect(page.getByText("You feel HAPPY today! 🎉")).toBeVisible();
    await page.getByRole("button", { name: "Do a happy wiggle dance!" }).click();
    await page.getByRole("button", { name: "happy option 1" }).click();
    await capture("mood-activity", "Mood activity (Happy, 1 of 3 done)", true);
    for (const activity of ["Smile as wide as you can!", "Give yourself a big hug!"]) {
      await page.getByRole("button", { name: activity }).click();
      await page.getByRole("button", { name: "happy option 1" }).click();
    }
    await page.getByRole("button", { name: /I'm ready to play/ }).click();
    await page.getByRole("button", { name: /Start the Game/ }).click();

    // Game: round screen, correct and wrong feedback, summary with the badge
    await expect(page.getByText("Round 1 of 4")).toBeVisible();
    await capture("game-round", "Game round", true);
    let score = (await answerRound(page, 1, true, 0)).score;
    await expect(page.getByRole("button", { name: /Next Round/ })).toBeEnabled();
    await capture("feedback-correct", "Correct feedback", true);
    await leaveResult(page, 1, true);
    score = (await answerRound(page, 2, false, score)).score;
    await expect(page.getByRole("button", { name: /Next Round/ })).toBeEnabled();
    await capture("feedback-wrong", "Wrong feedback", true);
    await leaveResult(page, 2, false);
    for (const round of [3, 4]) {
      const result = await answerRound(page, round, true, score);
      score = result.score;
      await leaveResult(page, round, true);
    }
    await expect(page.getByRole("dialog")).toContainText("First Star");
    await capture("summary-badge", "Summary with the First Star badge", true);
    await page.getByRole("dialog").getByRole("button", { name: /Nice/ }).click();

    // Learn, a feeling page, Ask Emo
    await navTab(page, "Learn").click();
    await expect(page.getByText("Pick a feeling 📖")).toBeVisible();
    await capture("learn", "Learn (feeling picker)", true);
    await page.getByRole("button", { name: "Learn about Sad", exact: true }).click();
    await expect(page.getByText(/things done/)).toBeVisible();
    await capture("learn-feeling", "Learn (a feeling page)", true);
    await page.getByRole("button", { name: "← All feelings" }).click();
    await page.getByRole("button", { name: /Ask Emo/ }).click();
    await page.getByLabel("Type your question").fill("Why do I feel sad sometimes?");
    const asked = page.waitForResponse((r) => r.url().endsWith("/buddy/ask"));
    await page.getByRole("button", { name: "Send" }).click();
    await asked;
    await expect(page.getByRole("button", { name: "Send" })).toBeDisabled();
    await capture("ask-emo", "Ask Emo (after one answer)", true);

    // Me and Badges
    const profile = page.waitForResponse((r) => r.url().endsWith("/profile"));
    await navTab(page, "Me").click();
    await profile;
    await expect(page.getByText("Sessions Played")).toBeVisible();
    await capture("me", "Me (profile)", true);
    await navTab(page, "Badges").click();
    await expect(page.getByText("First Star", { exact: true })).toBeVisible();
    await capture("badges", "Badges", true);

    // Remembered player on Welcome, then the PIN keypad
    await page.reload();
    await page.getByTitle("Home").click();
    await expect(page.getByText(`Hi ${nickname}! 👋`)).toBeVisible();
    await capture("welcome-remembered", "Welcome (remembered player)", true);
    await page.getByRole("button", { name: "Manage players", exact: true }).click();
    await expect(page.getByText("Enter the 4-digit PIN to continue")).toBeVisible();
    await capture("pin-keypad", "Parent PIN keypad", false);

    // Parent area
    const verified = page.waitForResponse((r) => r.url().endsWith("/parent/pin/verify"));
    await enterPin(page, PIN);
    await verified;
    // The remembered player is already selected, so each tab loads their data on opening
    const child = page.getByRole("button", { name: nickname });
    const dashboard = page.waitForResponse((r) => r.url().endsWith("/dashboard"));
    await parentTab(page, "Overview");
    await expect(child).toHaveAttribute("aria-pressed", "true");
    await dashboard;
    await expect(page.locator(".recharts-label-list text")).toHaveCount(4);
    await capture("parent-overview", "Parent Overview", false);
    const diary = page.waitForResponse((r) => /\/diary\?limit=/.test(r.url()));
    await parentTab(page, "Diary");
    await expect(child).toHaveAttribute("aria-pressed", "true");
    await diary;
    await expect(page.getByRole("heading", { name: /Questions asked to Emo/ })).toBeVisible();
    await capture("parent-diary", "Parent Diary", false);
    await parentTab(page, "About");
    await expect(page.getByRole("heading", { name: "About ℹ️" })).toBeVisible();
    await capture("parent-about", "Parent About", false);

    save();
    expect(states).toHaveLength(18);
  });
}

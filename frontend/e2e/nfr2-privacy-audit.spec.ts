import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Page, Request } from "@playwright/test";
import { test, expect, createPlayer, uniqueName, navTab, enterPin, answerRound, leaveResult, closeBadgePopups } from "./fixtures";
import { parentTab } from "./api";

// NFR2 evidence: no biometric data is captured, stored or sent. Writes its
// findings to NFR2_OUT (or the test's output folder) as JSON files.

const E2E_DIR = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = path.resolve(E2E_DIR, "..", "..", "backend");
const CHARACTERS_DIR = path.resolve(E2E_DIR, "..", "public", "images", "characters");
const ALLOWED_HOSTS = ["localhost:5173", "127.0.0.1:8001"];
const PIN = "3847";

const sha256 = (data: Buffer) => createHash("sha256").update(data).digest("hex");

function bundledImageHashes() {
  const hashes = new Map<string, string>();
  for (const emotion of readdirSync(CHARACTERS_DIR)) {
    for (const file of readdirSync(path.join(CHARACTERS_DIR, emotion))) {
      hashes.set(sha256(readFileSync(path.join(CHARACTERS_DIR, emotion, file))), `${emotion}/${file}`);
    }
  }
  return hashes;
}

/** The bytes of the multipart part named "file". */
function multipartFile(body: Buffer, contentType: string) {
  const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/)!;
  const delimiter = Buffer.from(`--${boundary[1] ?? boundary[2]}`);
  let start = body.indexOf(delimiter);
  while (start !== -1) {
    const next = body.indexOf(delimiter, start + delimiter.length);
    if (next === -1) break;
    const part = body.subarray(start + delimiter.length + 2, next - 2);
    const headerEnd = part.indexOf("\r\n\r\n");
    const headers = part.subarray(0, headerEnd).toString("utf-8");
    if (/name="file"/.test(headers)) {
      return { headers, data: part.subarray(headerEnd + 4) };
    }
    start = next;
  }
  throw new Error("No file part in multipart body");
}

type FileEntry = { size: number; mtimeMs: number };

function listFiles(root: string, skip: (rel: string) => boolean, depth = 20): Record<string, FileEntry> {
  const out: Record<string, FileEntry> = {};
  const walk = (dir: string, level: number) => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const full = path.join(dir, name);
      const rel = path.relative(root, full);
      if (skip(rel)) continue;
      let info;
      try {
        info = statSync(full);
      } catch {
        continue;
      }
      if (info.isDirectory()) {
        if (level < depth) walk(full, level + 1);
      } else {
        out[rel] = { size: info.size, mtimeMs: info.mtimeMs };
      }
    }
  };
  walk(root, 0);
  return out;
}

const skipBackend = (rel: string) => /(^|[\\/])(venv|__pycache__|\.pytest_cache)([\\/]|$)/.test(rel);

function snapshotFiles() {
  return {
    backend: listFiles(BACKEND_DIR, skipBackend),
    temp: listFiles(os.tmpdir(), () => false, 0),
  };
}

function diffFiles(before: Record<string, FileEntry>, after: Record<string, FileEntry>) {
  return {
    added: Object.keys(after).filter((f) => !(f in before)).sort(),
    changed: Object.keys(after).filter((f) => f in before && (before[f].size !== after[f].size || before[f].mtimeMs !== after[f].mtimeMs)).sort(),
  };
}

async function browserStorage(page: Page) {
  const inPage = await page.evaluate(async () => {
    const dump = (s: Storage) => Object.fromEntries(Array.from({ length: s.length }, (_, i) => [s.key(i)!, s.getItem(s.key(i)!)]));
    return {
      localStorage: dump(localStorage),
      sessionStorage: dump(sessionStorage),
      indexedDB: "databases" in indexedDB ? (await indexedDB.databases()).map((d) => d.name) : "not supported",
      documentCookie: document.cookie,
      cacheStorage: "caches" in window ? await caches.keys() : "not supported",
    };
  });
  return { ...inPage, contextCookies: await page.context().cookies() };
}

type LoggedRequest = {
  seq: number;
  method: string;
  url: string;
  host: string;
  resourceType: string;
  status?: number;
  body?: unknown;
};

test("NFR2: no biometric data is captured, stored or sent", async ({ page }) => {
  test.setTimeout(240_000);
  const out = process.env.NFR2_OUT ?? test.info().outputPath("nfr2");
  mkdirSync(out, { recursive: true });
  const save = (name: string, data: unknown) => writeFileSync(path.join(out, name), typeof data === "string" ? data : JSON.stringify(data, null, 1));

  const bundled = bundledImageHashes();
  expect(bundled.size).toBe(72);
  const filesBefore = snapshotFiles();

  const note = `NFR2 diary note ${Date.now()} zebra-lantern`;
  const question = "Why do I feel happy when I play?";
  const nickname = uniqueName("NFR2 Kid");

  // Every request the page makes, with API bodies; image uploads as hashes only
  const requests: LoggedRequest[] = [];
  const uploads: {
    seq: number; filename: string; bytes: number; sha256: string; bundled: string | null;
    routeSha256: string | null; wireBodySize: number | null; expectedBodySize: number;
  }[] = [];
  const routeHashes: (string | null)[] = [];
  const heatmaps: { seq: number; sha256: string; length: number }[] = [];
  const byRequest = new Map<Request, LoggedRequest>();
  const wireSizes = new Map<number, number>();

  // Chromium doesn't hand Playwright a Blob-based request body, so the upload
  // is hashed in the page just before fetch sends it (the request itself is
  // untouched) and tied to the wire by its exact body size.
  await page.addInitScript(() => {
    const w = window as unknown as { __nfr2Uploads: unknown[] };
    w.__nfr2Uploads = [];
    const originalFetch = window.fetch;
    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      const body = init?.body;
      if (body instanceof FormData) {
        const file = body.get("file");
        if (file instanceof Blob) {
          const data = await file.arrayBuffer();
          const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
          w.__nfr2Uploads.push({
            url: String(input),
            bytes: data.byteLength,
            type: file.type,
            sha256: Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join(""),
          });
        }
      }
      return originalFetch.call(this, input, init);
    };
  });
  // Also try to read the body where Playwright can intercept it
  await page.route("http://127.0.0.1:8001/predict", async (route) => {
    const body = route.request().postDataBuffer();
    routeHashes.push(body ? sha256(multipartFile(body, route.request().headers()["content-type"]).data) : null);
    await route.continue();
  });
  page.context().on("request", (req) => {
    const url = new URL(req.url());
    const entry: LoggedRequest = { seq: requests.length + 1, method: req.method(), url: req.url(), host: url.host, resourceType: req.resourceType() };
    const body = req.postDataBuffer();
    if (url.pathname === "/predict") {
      entry.body = "<image upload; see predict-uploads.json>";
    } else if (body) {
      entry.body = body.toString("utf-8");
    }
    requests.push(entry);
    byRequest.set(req, entry);
  });
  page.context().on("response", async (res) => {
    const entry = byRequest.get(res.request());
    if (entry) entry.status = res.status();
    if (entry && new URL(res.url()).pathname === "/predict") {
      wireSizes.set(entry.seq, (await res.request().sizes()).requestBodySize);
    }
    if (new URL(res.url()).pathname === "/predict" && res.ok()) {
      const heatmap: string | null = (await res.json()).heatmap_base64;
      if (heatmap) heatmaps.push({ seq: entry?.seq ?? -1, sha256: sha256(Buffer.from(heatmap)), length: heatmap.length });
    }
  });

  // Child: new player, mood, diary with a typed note
  await createPlayer(page, nickname, "Fox");
  await page.getByRole("button", { name: "happy", exact: true }).click();
  await page.getByRole("button", { name: "Continue →" }).click();
  await page.getByRole("button", { name: "Playing", exact: true }).click();
  await page.getByLabel("Tell me more (you can skip!)").fill(note);
  const diarySaved = page.waitForResponse((r) => /\/diary$/.test(r.url()) && r.request().method() === "POST");
  await page.getByRole("button", { name: "Save" }).click();
  expect((await diarySaved).status()).toBe(201);
  await page.getByRole("button", { name: "Continue →" }).click();

  // Mood activities, then a full game with real predictions
  const ready = page.getByRole("button", { name: /more activit|I'm ready to play/ });
  for (const activity of ["Do a happy wiggle dance!", "Smile as wide as you can!", "Give yourself a big hug!"]) {
    await page.getByRole("button", { name: activity }).click();
    await page.getByRole("button", { name: "happy option 1" }).click();
  }
  await ready.click();
  await page.getByRole("button", { name: /Start the Game/ }).click();
  let score = 0;
  for (let round = 1; round <= 4; round++) {
    const result = await answerRound(page, round, round % 2 === 1, score);
    score = result.score;
    await leaveResult(page, round, result.correct);
  }
  await closeBadgePopups(page, 1);

  // Learn, then Ask Emo with a typed question
  await navTab(page, "Learn").click();
  await page.getByRole("button", { name: "Learn about Sad", exact: true }).click();
  const clue = page.locator("section").filter({ has: page.getByRole("heading", { name: "Spot the clues 🔍" }) }).getByRole("button", { pressed: false }).first();
  await clue.click();
  await page.getByRole("button", { name: "← All feelings" }).click();
  await page.getByRole("button", { name: /Ask Emo/ }).click();
  await page.getByLabel("Type your question").fill(question);
  const asked = page.waitForResponse((r) => r.url().endsWith("/buddy/ask"));
  await page.getByRole("button", { name: "Send" }).click();
  expect((await asked).status()).toBe(200);

  // Parent: create a PIN, Overview, CSV, Diary
  await navTab(page, "Me").click();
  await page.getByTitle("Parent/Teacher").click();
  await enterPin(page, PIN);
  await enterPin(page, PIN);
  await expect(page.getByRole("heading", { name: "Save your recovery code" })).toBeVisible();
  await page.getByRole("checkbox", { name: "I've saved it" }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Session Overview 📊" })).toBeVisible();
  await expect(page.getByText("Total Sessions", { exact: true }).locator("xpath=following-sibling::div[1]")).toHaveText("1");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download Report CSV/ }).click();
  const csv = readFileSync(await (await downloaded).path()).toString("utf-8");
  await parentTab(page, "Diary");
  await page.getByRole("button", { name: nickname }).click();
  await expect(page.getByText(note)).toBeVisible();
  await expect(page.getByText(question)).toBeVisible();

  // ---------- evidence ----------
  const pageUploads = await page.evaluate(() => (window as unknown as { __nfr2Uploads: { url: string; bytes: number; type: string; sha256: string }[] }).__nfr2Uploads);
  const predictRequests = requests.filter((r) => new URL(r.url).pathname === "/predict");
  // FormData.append(name, blob, "character.png") in lib/predictionClient.ts; Chromium's boundary is 38 characters
  const boundary = `----WebKitFormBoundary${"x".repeat(16)}`;
  const multipartSize = (bytes: number, type: string) =>
    Buffer.byteLength(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="character.png"\r\nContent-Type: ${type}\r\n\r\n`) +
    bytes +
    Buffer.byteLength(`\r\n--${boundary}--\r\n`);
  pageUploads.forEach((u, i) => {
    const seq = predictRequests[i]?.seq ?? -1;
    uploads.push({
      seq, filename: "character.png", bytes: u.bytes, sha256: u.sha256, bundled: bundled.get(u.sha256) ?? null,
      routeSha256: routeHashes[i] ?? null, wireBodySize: wireSizes.get(seq) ?? null, expectedBodySize: multipartSize(u.bytes, u.type),
    });
  });
  const storage = await browserStorage(page);
  const dbDump = JSON.parse(execFileSync(
    path.join(BACKEND_DIR, "venv", "Scripts", "python.exe"),
    [path.join(BACKEND_DIR, "scripts", "dump_test_db.py"), process.env.E2E_DB_PATH!],
    { cwd: BACKEND_DIR, encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 }
  ));
  const filesAfter = snapshotFiles();
  const runDbFolder = path.relative(BACKEND_DIR, path.dirname(process.env.E2E_DB_PATH!));
  const backendDiff = diffFiles(filesBefore.backend, filesAfter.backend);
  const tempDiff = diffFiles(filesBefore.temp, filesAfter.temp);

  save("requests.json", requests);
  save("predict-uploads.json", { bundledImages: bundled.size, uploads, heatmapsReturned: heatmaps });
  save("browser-storage.json", storage);
  save("db-dump.json", dbDump);
  save("report.csv", csv);
  save("files.json", {
    backend: { ...backendDiff, runDbFolder },
    debugOutputs: backendDiff.added.filter((f) => f.startsWith("debug_outputs")),
    temp: { folder: os.tmpdir(), ...tempDiff },
  });

  // ---------- checks ----------
  const hosts = [...new Set(requests.map((r) => r.host))].sort();
  save("hosts.json", hosts);
  expect(hosts.filter((h) => !ALLOWED_HOSTS.includes(h))).toEqual([]);

  expect(predictRequests).toHaveLength(4);
  expect(uploads).toHaveLength(4);
  expect(uploads.filter((u) => u.bundled === null)).toEqual([]);
  for (const u of uploads) {
    expect(u.wireBodySize, `request ${u.seq}`).toBe(u.expectedBodySize);
    if (u.routeSha256 !== null) expect(u.routeSha256).toBe(u.sha256);
  }

  const childText = [note, question, nickname];
  const carrying = (text: string) => requests.filter((r) => r.url.includes(encodeURIComponent(text)) || r.url.includes(text) || (typeof r.body === "string" && r.body.includes(text)));
  const textDestinations: Record<string, string[]> = {};
  for (const text of childText) {
    const found = carrying(text);
    textDestinations[text] = found.map((r) => `${r.method} ${r.url}`);
    expect(found.every((r) => r.host === "127.0.0.1:8001"), text).toBe(true);
    expect(found.every((r) => !r.url.includes(text) && !r.url.includes(encodeURIComponent(text))), text).toBe(true);
  }
  save("child-text-destinations.json", textDestinations);
  expect(textDestinations[note]).toEqual([expect.stringMatching(/^POST http:\/\/127\.0\.0\.1:8001\/players\/[^/]+\/diary$/)]);
  expect(textDestinations[question]).toEqual([expect.stringMatching(/^POST http:\/\/127\.0\.0\.1:8001\/players\/[^/]+\/buddy\/ask$/)]);

  expect(dbDump.findings).toEqual([]);

  // Heatmaps are made from the uploaded bundled image and only live in the response
  const storageText = JSON.stringify(storage);
  const dbText = JSON.stringify(dbDump);
  expect(heatmaps.length).toBeGreaterThan(0);
  for (const text of [storageText, dbText]) {
    expect(text).not.toContain("data:image");
    expect(text).not.toMatch(/[A-Za-z0-9+/]{200,}/);
  }
  for (const text of [note, question, PIN]) expect(storageText).not.toContain(text);
  expect(csv).not.toContain(note);
  expect(csv).not.toContain(question);

  expect(backendDiff.added.filter((f) => !f.startsWith(runDbFolder))).toEqual([]);
  expect(backendDiff.changed.filter((f) => !f.startsWith(runDbFolder))).toEqual([]);
});

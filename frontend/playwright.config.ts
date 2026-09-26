import { defineConfig, devices } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FRONTEND_DIR = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = path.resolve(FRONTEND_DIR, "..", "backend");
const E2E_DATA_DIR = path.join(BACKEND_DIR, "data", "e2e");
const NORMAL_DB = path.join(BACKEND_DIR, "data", "emolearn.db");
const BACKEND_PORT = 8001;

// Playwright loads this file in the runner and again in each worker; the run
// id is made once by the runner and handed to the workers through the environment.
const isRunner = process.env.TEST_WORKER_INDEX === undefined;
if (isRunner) {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  process.env.E2E_RUN_ID = `run-${stamp}-${randomBytes(4).toString("hex")}`;
}
const E2E_DB_PATH = path.join(E2E_DATA_DIR, process.env.E2E_RUN_ID!, "test.db");
process.env.E2E_DB_PATH = E2E_DB_PATH;

function assertSafeDbPath(dbPath: string) {
  const resolved = path.resolve(dbPath);
  const relative = path.relative(E2E_DATA_DIR, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to run: test DB ${resolved} is outside ${E2E_DATA_DIR}`);
  }
  if (resolved.toLowerCase() === path.resolve(NORMAL_DB).toLowerCase()) {
    throw new Error("Refusing to run: test DB is the normal emolearn.db");
  }
  if (isRunner && (existsSync(resolved) || existsSync(path.dirname(resolved)))) {
    throw new Error(`Refusing to run: test DB ${resolved} already exists`);
  }
}
assertSafeDbPath(E2E_DB_PATH);

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }], ["./e2e/cleanup-reporter.ts"]],
  use: {
    baseURL: "http://localhost:5173",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `venv\\Scripts\\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port ${BACKEND_PORT}`,
      cwd: BACKEND_DIR,
      url: `http://127.0.0.1:${BACKEND_PORT}/`,
      env: { EMOLEARN_DB_PATH: E2E_DB_PATH },
      reuseExistingServer: false,
      timeout: 180_000,
      // E2E_BACKEND_STDOUT=pipe also shows uvicorn's access log, e.g. for the NFR2 log audit
      stdout: process.env.E2E_BACKEND_STDOUT === "pipe" ? "pipe" : "ignore",
      stderr: "pipe",
    },
    {
      command: "npm run dev -- --host localhost --port 5173 --strictPort",
      cwd: FRONTEND_DIR,
      url: "http://localhost:5173",
      env: { VITE_API_URL: `http://127.0.0.1:${BACKEND_PORT}`, VITE_USE_MOCK: "false" },
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});

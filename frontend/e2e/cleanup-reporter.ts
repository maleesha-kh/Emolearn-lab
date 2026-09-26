import type { FullResult, Reporter } from "@playwright/test/reporter";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const E2E_DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "backend", "data", "e2e");

// Deletes this run's database folder, but only when every test passed;
// after a failure it is kept for inspection.
export default class CleanupReporter implements Reporter {
  private status: FullResult["status"] = "failed";

  onEnd(result: FullResult) {
    this.status = result.status;
  }

  // Runs after the web servers have stopped, so the backend no longer holds the file
  async onExit() {
    const runDir = path.resolve(E2E_DATA_DIR, process.env.E2E_RUN_ID ?? "");
    if (path.dirname(runDir) !== E2E_DATA_DIR || !path.basename(runDir).startsWith("run-")) {
      console.log(`[cleanup] Unexpected run folder ${runDir}; nothing deleted`);
      return;
    }
    if (!existsSync(runDir)) return;
    if (this.status !== "passed") {
      console.log(`[cleanup] Run ${this.status}; keeping ${runDir}`);
      return;
    }
    rmSync(runDir, { recursive: true, maxRetries: 10, retryDelay: 500 });
    console.log(`[cleanup] All tests passed; deleted ${runDir}`);
  }

  printsToStdio() {
    return false;
  }
}

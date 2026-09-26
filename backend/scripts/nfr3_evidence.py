"""Reproduce the NFR3 interface evidence with one command.

    backend\\venv\\Scripts\\python.exe backend\\scripts\\nfr3_evidence.py [--allow-dirty] [--out-root DIR]

1. Records git.json (commit and `git status --porcelain`) before anything is
   written; stops if the tree isn't clean, unless --allow-dirty is given.
2. Runs frontend/e2e/nfr3-screens.spec.ts with NFR3_OUT set to a temporary folder:
   18 screens at 375x812 and 1280x800, each with a screenshot, layout checks and
   axe results (Playwright starts and stops both servers; ports 5173 and 8001 must be free).
3. Runs nfr3_report.py to write report.md.
4. Copies the folder to <out-root>/<date-time>/ (default evidence/nfr3/).

Exits non-zero if the spec fails, the evidence is incomplete, or the pass criteria aren't met;
the evidence is copied in the last case.
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
PROJECT_DIR = SCRIPTS_DIR.parent.parent
FRONTEND_DIR = PROJECT_DIR / "frontend"
VIEWPORTS = ["375x812", "1280x800"]
SPEC_OUTPUTS = [f"{kind}-{vp}.json" for vp in VIEWPORTS for kind in ("states", "checks", "axe")]


def git(*args: str) -> str:
    return subprocess.run(["git", *args], cwd=PROJECT_DIR, capture_output=True, text=True, check=True).stdout


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--allow-dirty", action="store_true", help="Run even if the working tree has changes (recorded in git.json)")
    parser.add_argument("--out-root", type=Path, default=PROJECT_DIR / "evidence" / "nfr3", help="Where the <date-time> folder goes")
    args = parser.parse_args()

    # 1. Git state, before anything is written
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    commit = git("rev-parse", "HEAD").strip()
    porcelain = [line for line in git("status", "--porcelain").splitlines() if line]
    if porcelain and not args.allow_dirty:
        print("The working tree isn't clean, so the evidence wouldn't match a commit:", file=sys.stderr)
        print("\n".join("  " + line for line in porcelain), file=sys.stderr)
        print("Commit or stash the changes, or pass --allow-dirty.", file=sys.stderr)
        return 2
    target = args.out_root.resolve() / stamp
    if target.exists():
        print(f"{target} already exists", file=sys.stderr)
        return 2
    git_info = {"run": stamp, "commit": commit, "porcelain_lines": len(porcelain), "porcelain": porcelain,
                "allow_dirty": args.allow_dirty, "checked_before_run": datetime.now().astimezone().isoformat(timespec="seconds")}

    work = Path(tempfile.mkdtemp(prefix=f"nfr3-{stamp}-"))
    (work / "git.json").write_text(json.dumps(git_info, indent=1), encoding="utf-8")
    print(f"[nfr3] commit {commit[:7]}, {len(porcelain)} uncommitted change(s); working in {work}", flush=True)

    # 2. Screens spec
    npx = shutil.which("npx")
    if npx is None:
        print("npx not found on PATH", file=sys.stderr)
        return 2
    print("[nfr3] running the screens spec (about 2 minutes)...", flush=True)
    with (work / "run.log").open("w", encoding="utf-8") as log:
        spec = subprocess.run([npx, "playwright", "test", "nfr3-screens"], cwd=FRONTEND_DIR,
                              env=dict(os.environ, NFR3_OUT=str(work)), stdout=log, stderr=subprocess.STDOUT)
    missing = [name for name in SPEC_OUTPUTS if not (work / name).exists()]
    if missing:
        print(f"[nfr3] the spec stopped before writing {', '.join(missing)}; see {work / 'run.log'}", file=sys.stderr)
        return 1

    # 3. Report
    report = subprocess.run([sys.executable, str(SCRIPTS_DIR / "nfr3_report.py"), str(work)], capture_output=True, text=True)
    # nfr3_report.py exits 0 = pass, 1 = criteria not met, 2 = evidence incomplete; anything else is a crash
    if report.returncode not in (0, 1, 2) or not (work / "report.md").exists():
        print(f"[nfr3] nfr3_report.py failed, so there is no report.md:\n{report.stderr}", file=sys.stderr)
        print(f"[nfr3] the collected files are kept in {work}", file=sys.stderr)
        return 1
    print("[nfr3] " + report.stdout.strip().splitlines()[-1], flush=True)
    if report.returncode == 2:
        print("[nfr3] the evidence is incomplete; see the top of report.md", file=sys.stderr)

    # 4. Copy
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(work, target)
    shutil.rmtree(work, ignore_errors=True)
    print(f"[nfr3] evidence in {target}", flush=True)
    return 1 if spec.returncode != 0 or report.returncode != 0 else 0


if __name__ == "__main__":
    sys.exit(main())

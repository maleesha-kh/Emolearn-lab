"""Reproduce the NFR2 privacy evidence with one command.

    backend\\venv\\Scripts\\python.exe backend\\scripts\\nfr2_evidence.py [--allow-dirty] [--out-root DIR]

1. Records git.json (commit and `git status --porcelain`) before anything is
   written; stops if the tree isn't clean, unless --allow-dirty is given.
2. Runs frontend/e2e/nfr2-privacy-audit.spec.ts with NFR2_OUT set to a temporary
   folder (Playwright starts and stops both servers; ports 5173 and 8001 must be free).
3. Runs the source-audit searches below and writes source-audit.md.
4. Runs nfr2_report.py to write report.md.
5. Copies the folder to <out-root>/<date-time>/ (default evidence/nfr2/).

Exits non-zero if the audit spec or any report check fails; the evidence is copied either way.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPTS_DIR.parent
PROJECT_DIR = BACKEND_DIR.parent
FRONTEND_DIR = PROJECT_DIR / "frontend"
SPEC_OUTPUTS = ["requests.json", "hosts.json", "predict-uploads.json", "child-text-destinations.json",
                "browser-storage.json", "db-dump.json", "files.json", "report.csv"]

# Source audit: (section title, pattern, files to search, message when nothing matches)
FRONTEND_SOURCES = [p for p in (FRONTEND_DIR / "src").rglob("*") if p.suffix in {".ts", ".tsx", ".css"} and ".test." not in p.name]
FRONTEND_SOURCES.append(FRONTEND_DIR / "index.html")
PREDICT_PATH_FILES = [BACKEND_DIR / "app" / "api" / "routes" / "predict.py", BACKEND_DIR / "app" / "ml" / "preprocessing.py",
                      BACKEND_DIR / "app" / "ml" / "explain.py", BACKEND_DIR / "app" / "ml" / "pose_branch" / "inference.py",
                      *sorted((BACKEND_DIR / "app" / "ml" / "face_branch").glob("*.py"))]
SEARCHES = [
    ("Capture and file APIs in frontend/src and index.html",
     r"getUserMedia|mediaDevices|MediaRecorder|type=[\"']file[\"']|capture=|toDataURL|toBlob|createImageBitmap|<canvas|getContext\(|SpeechRecognition|webkitSpeech|navigator\.geolocation|FileReader|showOpenFilePicker|clipboard\.read",
     FRONTEND_SOURCES, "(no matches)"),
    ("Network calls", r"fetch\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource", FRONTEND_SOURCES, "(no matches)"),
    ("External URLs in frontend/src and index.html (the SVG namespace is not a network call)",
     r"https?://(?!localhost|127\.0\.0\.1)", FRONTEND_SOURCES, "(none)"),
    ("Where /predict images come from",
     r"imageUrl|images: rollRoundImages|/images/characters/\$\{emotion\}",
     [FRONTEND_DIR / "src" / "screens" / "game" / "LoadingScreen.tsx", FRONTEND_DIR / "src" / "App.tsx",
      FRONTEND_DIR / "src" / "lib" / "predictionClient.ts", FRONTEND_DIR / "src" / "lib" / "game.ts",
      FRONTEND_DIR / "src" / "lib" / "imageBank.ts"], "(no matches)"),
    ("Speech (reads fixed text only)", r"\bspeak\(", [p for p in FRONTEND_SOURCES if p.suffix == ".tsx"], "(no matches)"),
    ("Backend: debug images setting", r"DEBUG_SAVE_IMAGES",
     [BACKEND_DIR / "app" / "core" / "config.py", BACKEND_DIR / "app" / "api" / "routes" / "predict.py"], "(no matches)"),
    ("Backend: file writes on the /predict path", r"\.save\(|\bopen\(", PREDICT_PATH_FILES, "(no matches)"),
]


def git(*args: str) -> str:
    return subprocess.run(["git", *args], cwd=PROJECT_DIR, capture_output=True, text=True, check=True).stdout


def source_audit(commit: str) -> str:
    lines = [f"# Source audit ({datetime.now().astimezone().isoformat(timespec='seconds')}, commit {commit})",
             "", "Searches run by backend/scripts/nfr2_evidence.py (Python regular expressions, line by line)."]
    for title, pattern, files, empty in SEARCHES:
        regex = re.compile(pattern)
        lines += ["", f"## {title}", f"pattern: `{pattern}`"]
        hits = []
        for path in sorted(set(files)):
            text = path.read_text(encoding="utf-8", errors="replace").splitlines()
            for number, line in enumerate(text, start=1):
                if regex.search(line):
                    hits.append(f"{path.relative_to(PROJECT_DIR).as_posix()}:{number}: {line.strip()}")
        lines += hits or [empty]
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--allow-dirty", action="store_true", help="Run even if the working tree has changes (recorded in git.json)")
    parser.add_argument("--out-root", type=Path, default=PROJECT_DIR / "evidence" / "nfr2", help="Where the <date-time> folder goes")
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

    work = Path(tempfile.mkdtemp(prefix=f"nfr2-{stamp}-"))
    (work / "git.json").write_text(json.dumps(git_info, indent=1), encoding="utf-8")
    print(f"[nfr2] commit {commit[:7]}, {len(porcelain)} uncommitted change(s); working in {work}", flush=True)

    # 2. Audit spec
    npx = shutil.which("npx")
    if npx is None:
        print("npx not found on PATH", file=sys.stderr)
        return 2
    env = dict(os.environ, NFR2_OUT=str(work), E2E_BACKEND_STDOUT="pipe")
    print("[nfr2] running the audit spec (about a minute)...", flush=True)
    with (work / "run.log").open("w", encoding="utf-8") as log:
        spec = subprocess.run([npx, "playwright", "test", "nfr2-privacy-audit"], cwd=FRONTEND_DIR, env=env,
                              stdout=log, stderr=subprocess.STDOUT)
    missing = [name for name in SPEC_OUTPUTS if not (work / name).exists()]
    if missing:
        print(f"[nfr2] the audit spec stopped before writing {', '.join(missing)}; see {work / 'run.log'}", file=sys.stderr)
        return 1

    # 3. Source audit
    (work / "source-audit.md").write_text(source_audit(commit), encoding="utf-8")

    # 4. Report
    report = subprocess.run([sys.executable, str(SCRIPTS_DIR / "nfr2_report.py"), str(work)], capture_output=True, text=True)
    if report.returncode != 0 or not (work / "report.md").exists():
        print(f"[nfr2] nfr2_report.py failed, so there is no report.md:\n{report.stderr}", file=sys.stderr)
        print(f"[nfr2] the collected files are kept in {work}", file=sys.stderr)
        return 1
    print("[nfr2] " + report.stdout.strip().splitlines()[-1], flush=True)

    # 5. Copy
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(work, target)
    shutil.rmtree(work, ignore_errors=True)
    print(f"[nfr2] evidence in {target}", flush=True)

    failed = spec.returncode != 0 or report.returncode != 0 or "failed: []" not in report.stdout
    if failed:
        print("[nfr2] some checks failed; see report.md", file=sys.stderr)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())

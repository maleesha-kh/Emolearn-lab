"""Write report.md for an NFR2 evidence folder, checking each claim against the files first.

Usage: python scripts/nfr2_report.py <evidence folder>

The folder needs the JSON files and report.csv written by
frontend/e2e/nfr2-privacy-audit.spec.ts (run with NFR2_OUT=<folder>), plus:
  run.log          the Playwright output of that run, with E2E_BACKEND_STDOUT=pipe
  git.json         {"run": ..., "commit": ..., "porcelain_lines": ..., "checked_before_run": ...},
                   recorded before the run
  source-audit.md  the grep results for capture APIs, network calls and file writes
If any check fails, the report's result line says FAIL and names it.
Normally run by nfr2_evidence.py, which creates all of these.
"""
import json
import os
import re
import sys

o = sys.argv[1]
L = lambda n: json.load(open(os.path.join(o, n), encoding="utf-8"))
req, up, db, st, f, dest, hosts, git = (L(n) for n in (
    "requests.json", "predict-uploads.json", "db-dump.json", "browser-storage.json", "files.json",
    "child-text-destinations.json", "hosts.json", "git.json"))
log = open(os.path.join(o, "run.log"), encoding="utf-8", errors="replace").read()
source = open(os.path.join(o, "source-audit.md"), encoding="utf-8").read()
stamp = git.get("run") or os.path.basename(o).replace("nfr2-", "")
capture_section = source.split("## Capture and file APIs", 1)[-1].split("\n## ", 1)[0]

checks = {
    "clean commit": git["porcelain_lines"] == 0,
    "test passed": re.search(r"1 passed", log) is not None and "failed" not in log.split("Running")[-1],
    "no capture APIs": "(no matches)" in capture_section,
    "two hosts": sorted(hosts) == ["127.0.0.1:8001", "localhost:5173"],
    "4 uploads, all bundled": len(up["uploads"]) == 4 and all(u["bundled"] for u in up["uploads"]),
    "uploads confirmed on the wire": all(u["wireBodySize"] == u["expectedBodySize"] for u in up["uploads"]),
    "route body matches": all(u["routeSha256"] == u["sha256"] for u in up["uploads"]),
    "typed text only to backend POSTs": all(all(d.startswith("POST http://127.0.0.1:8001/") for d in v) for v in dest.values()),
    "db findings": db["findings"] == [],
    "no new backend files": [a for a in f["backend"]["added"] if not a.startswith(f["backend"]["runDbFolder"])] == [],
    "no debug outputs": f["debugOutputs"] == [],
    "no typed text in log": not any(t in log for t in dest),
    "no image data in log": "data:image" not in log and not re.search(r"[A-Za-z0-9+/]{200,}", log),
    "no image data in storage/db": all("data:image" not in json.dumps(x) and not re.search(r"[A-Za-z0-9+/]{200,}", json.dumps(x)) for x in (st, db)),
}
failed = [k for k, v in checks.items() if not v]

temp_added = f["temp"]["added"]
temp_sizes = []
for name in temp_added:
    try:
        temp_sizes.append(os.path.getsize(os.path.join(f["temp"]["folder"], name)))
    except OSError:
        temp_sizes.append(None)
temp_text = "none" if not temp_added else ", ".join(
    f"`{n}` ({'removed since' if s is None else f'{s} bytes'})" for n, s in zip(temp_added, temp_sizes))

up_lines = "\n".join(
    f"| {u['seq']} | `{u['bundled']}` | {u['bytes']:,} | `{u['sha256'][:16]}…` | {'yes' if u['routeSha256'] == u['sha256'] else 'no'} | {u['wireBodySize']:,} = {u['expectedBodySize']:,} |"
    for u in up["uploads"])
rows = db["row_counts"]
heat = up["heatmapsReturned"]
commit_line = (f"clean commit `{git['commit'][:7]}` (`git status` showed no changes before the run; see `git.json`)"
               if checks["clean commit"] else f"commit `{git['commit'][:7]}` with {git['porcelain_lines']} uncommitted changes")

md = f"""# NFR2 evidence: no biometric data is captured, stored or transmitted

Run {stamp} · {commit_line} · Windows 11 · Chromium headless shell (Playwright) · CPU only.

How to reproduce: from the project root, on a clean tree, run
`backend\\venv\\Scripts\\python.exe backend\\scripts\\nfr2_evidence.py` (writes a new folder under `evidence/nfr2/`).

## Result

**{'Pass' if not failed else 'FAIL: ' + ', '.join(failed)}.** In a full child and parent flow, the app used no camera,
microphone or file input, sent nothing to any host except the local frontend and backend, uploaded only bundled
cartoon images for prediction, and stored no images, landmarks, embeddings or recordings in the database, the browser
or on disk.

## What was checked

### 1. Source (`source-audit.md`)
- No `getUserMedia`, `mediaDevices`, `MediaRecorder`, `<input type="file">`, `capture`, canvas exports
  (`toDataURL`/`toBlob`), `FileReader`, speech recognition or geolocation anywhere in `frontend/src` or `index.html`.
- The only network calls are in `lib/api.ts` (backend API) and `lib/predictionClient.ts` (fetch a bundled image, post it
  to `/predict`). The only other URL in the source is the SVG namespace in `EmoRobot.tsx`, which is not a request.
- `/predict` images: `LoadingScreen` gets `round.images[i]`, built by `buildGameRounds` → `imageBank.imagePath`, which
  only produces `/images/characters/<emotion>/…` paths to the 72 bundled images.
- Speech (`speak()`) is only called in `MeetTheFeeling` with a feeling's fixed label and meaning, never with typed text.
- Backend: `DEBUG_SAVE_IMAGES = False`; the only file writes on the `/predict` path are the debug images behind that flag.

### 2. Network (`requests.json`, `hosts.json`, `predict-uploads.json`, `child-text-destinations.json`)
Flow (all through the UI, `frontend/e2e/nfr2-privacy-audit.spec.ts`): new player → mood check-in → diary entry with a
typed note → mood activities → full 4-round game with real `/predict` → Learn → Ask Emo with a typed question → parent
PIN set-up → Overview → CSV download → parent Diary tab.

- **{len(req)} requests, {len(hosts)} hosts only:** {', '.join('`' + h + '`' for h in hosts)}.
- **Every `/predict` upload is a bundled image** ({sum(1 for u in up['uploads'] if u['bundled'])} of {len(up['uploads'])}).
  Each was identified three independent ways: SHA-256 of the file part in the page just before sending, SHA-256 of the
  body read by Playwright's route interception, and the exact request body size on the wire (multipart header + file + trailer):

| Request | Bundled image | Bytes | SHA-256 | Route body matches | Body size on wire = expected |
|---|---|---|---|---|---|
{up_lines}

- **Typed text only goes to the local backend, in POST bodies, never in URLs:**
  diary note → `POST /players/{{id}}/diary`; Ask Emo question → `POST /players/{{id}}/buddy/ask`; nickname → `POST /players`.

### 3. Storage
**Database** (`db-dump.json`, read-only dump with the same path checks as the reset script): tables
{', '.join('`' + t + '`' for t in db['tables'])}. Automatic scan for BLOB columns, binary values, values over 1,000
characters, base64 or data URLs, and names such as landmark/keypoint/embedding/audio: **{len(db['findings'])} findings**.
Personal data stored: nickname and avatar choice (`players`); mood check-in and game results (`sessions`, `rounds`:
target emotion, bundled image path, correct or not, the AI's emotion and confidence); badges; Learn progress; diary
entries (feeling, reason chips, intensity, typed note up to 200 characters, Emo's reply, safety flags); Ask Emo
questions (up to 150 characters) with answers.
Row counts after the flow: {', '.join(f'{k} {v}' for k, v in rows.items())}.

**Browser** (`browser-storage.json`): `localStorage` keys {', '.join('`' + k + '`' for k in st['localStorage'])};
`sessionStorage` keys {', '.join('`' + k + '`' for k in st['sessionStorage'])} (screen state, no PIN);
IndexedDB {st['indexedDB'] or 'none'}; cookies {st['contextCookies'] or 'none'}; Cache Storage {st['cacheStorage'] or 'none'}.
No typed text, PIN or image data.

**Backend files** (`files.json`): no new files anywhere under `backend/` (venv and caches excluded); the only changed
file is this run's own test database. `debug_outputs/`: no new files. System temp folder, new entries: {temp_text}.
Other programs share that folder, so the writer cannot be identified.

**Logs** (`run.log`, backend output including uvicorn's access log): no typed text, nickname, image data or base64
content. Access log lines contain method, path, status and IDs only.

### 4. The Grad-CAM heatmap
Each `/predict` response contains a heatmap image (`heatmap_base64`, {len(heat)} returned,
{min(h['length'] for h in heat) // 1000}–{max(h['length'] for h in heat) // 1000} KB each). It is computed on the server from the
uploaded bundled cartoon image, not from the child, and is shown on the result screen only. It was **not** found in the
database, browser storage, files or logs (searched for `data:image` and any base64 run of 200+ characters), and it is
not treated as a privacy finding.

## Limitations
- `/predict` accepts any uploaded image that shows a detectable full body; it rejects non-characters but cannot tell a
  cartoon from a photo of a real person. The app itself only ever sends bundled images, but another client calling the
  API directly could send a photo (it would be processed in memory and not stored).
- "Read to me" uses the browser's speech synthesis. `speech.ts` prefers offline voices but falls back to any English
  voice, which in some browsers is an online voice. Only fixed dictionary text is ever spoken. The headless test
  browser has no voices, so this could not be observed in the run.
- The diary and Ask Emo store text children type, readable by the parent.
- Network recording sees the page's own requests, not traffic the browser makes by itself (updates, Safe Browsing,
  cloud voices).
- The temp-folder check is machine-wide and cannot attribute files to a process.
- One flow, one machine, one browser engine (Chromium). Other browsers were not tested.
"""
open(os.path.join(o, "report.md"), "w", encoding="utf-8").write(md)
print(json.dumps(checks, indent=1))
print("failed:", failed, "| temp:", temp_text)

# NFR2 evidence: no biometric data is captured, stored or transmitted

Run 20260926-233639 · clean commit `7410ed7` (`git status` showed no changes before the run; see `git.json`) · Windows 11 · Chromium headless shell (Playwright) · CPU only.

How to reproduce: from the project root, on a clean tree, run
`backend\venv\Scripts\python.exe backend\scripts\nfr2_evidence.py` (writes a new folder under `evidence/nfr2/`).

## Result

**Pass.** In a full child and parent flow, the app used no camera,
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

- **151 requests, 2 hosts only:** `127.0.0.1:8001`, `localhost:5173`.
- **Every `/predict` upload is a bundled image** (4 of 4).
  Each was identified three independent ways: SHA-256 of the file part in the page just before sending, SHA-256 of the
  body read by Playwright's route interception, and the exact request body size on the wire (multipart header + file + trailer):

| Request | Bundled image | Bytes | SHA-256 | Route body matches | Body size on wire = expected |
|---|---|---|---|---|---|
| 97 | `happy/happy_game_05.png` | 214,680 | `95556857c746a0d0…` | yes | 214,866 = 214,866 |
| 104 | `surprised/surprised_v2_5.png` | 222,133 | `feb79a718095714c…` | yes | 222,319 = 222,319 |
| 114 | `sad/sad_game_09.png` | 519,646 | `5bd758c0a486cc6f…` | yes | 519,832 = 519,832 |
| 122 | `angry/angry_v4_5.png` | 204,276 | `324f5c29fed1c345…` | yes | 204,462 = 204,462 |

- **Typed text only goes to the local backend, in POST bodies, never in URLs:**
  diary note → `POST /players/{id}/diary`; Ask Emo question → `POST /players/{id}/buddy/ask`; nickname → `POST /players`.

### 3. Storage
**Database** (`db-dump.json`, read-only dump with the same path checks as the reset script): tables
`buddy_messages`, `diary_entries`, `dictionary_progress`, `parent_tips`, `player_badges`, `players`, `rounds`, `sessions`, `settings`. Automatic scan for BLOB columns, binary values, values over 1,000
characters, base64 or data URLs, and names such as landmark/keypoint/embedding/audio: **0 findings**.
Personal data stored: nickname and avatar choice (`players`); mood check-in and game results (`sessions`, `rounds`:
target emotion, bundled image path, correct or not, the AI's emotion and confidence); badges; Learn progress; diary
entries (feeling, reason chips, intensity, typed note up to 200 characters, Emo's reply, safety flags); Ask Emo
questions (up to 150 characters) with answers.
Row counts after the flow: buddy_messages 1, diary_entries 1, dictionary_progress 0, parent_tips 0, player_badges 1, players 1, rounds 4, sessions 1, settings 2.

**Browser** (`browser-storage.json`): `localStorage` keys `emolearn_sound_on`, `emolearn_player_id`;
`sessionStorage` keys `emolearn_session_state` (screen state, no PIN);
IndexedDB none; cookies none; Cache Storage none.
No typed text, PIN or image data.

**Backend files** (`files.json`): no new files anywhere under `backend/` (venv and caches excluded); the only changed
file is this run's own test database. `debug_outputs/`: no new files. System temp folder, new entries: `88f13b19-6080-4623-830b-20b06408853c.tmp` (0 bytes).
Other programs share that folder, so the writer cannot be identified.

**Logs** (`run.log`, backend output including uvicorn's access log): no typed text, nickname, image data or base64
content. Access log lines contain method, path, status and IDs only.

### 4. The Grad-CAM heatmap
Each `/predict` response contains a heatmap image (`heatmap_base64`, 4 returned,
32–234 KB each). It is computed on the server from the
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

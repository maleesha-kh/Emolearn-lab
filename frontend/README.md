# EmoLearn Lab — Frontend

React + Vite + TypeScript + Tailwind app for the EmoLearn Lab capstone project.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-checks then builds to dist/
```

## Folder structure

```
public/
  images/characters/<happy|sad|angry|surprised>/   real dataset photos (background-removed), served as static files
src/
  types/           shared TypeScript types (Scr, Mood, Round, EmotionInfo, Badge, ...)
  data/            static content: rounds.ts, emotions.ts, badges.ts
  lib/
    imageBank.ts   random image selection from the dataset, per-emotion and per-round
    mockModel.ts   STUB emotion predictor — swap this out for the real model (see below)
  components/
    common/        small reusable UI: TopBar, Btn, Stars, Confetti, BgDeco, HeatmapOverlay,
                    EmoRobot (mascot SVG), BadgeModal, BottomNav
    character/
      CharacterImage.tsx   renders a dataset photo in place of the old Figma AnimeGirl SVG
  screens/         one file per screen; game/ and responses/ hold the game-flow and
                    mood-response screens respectively
  styles/          global CSS + the animations.ts keyframe string
  App.tsx          screen routing + top-level state
  main.tsx         entry point
```

This replaces the previous single 1,663-line `App.tsx`. The unused `shadcn/ui`
component library that shipped with the original Figma export (272KB, never
imported anywhere, missing dependencies) was removed — it was dead code that
would have broken `npm run build`.

## The image bank (`src/lib/imageBank.ts`)

The dataset (`test.zip`) is **one character** ("Nara") with **8 pose photos
per emotion × 4 emotions = 32 images total** — not multiple different
character sets.

- `pickRandomImage(emotion)` — one random variant for that emotion, avoiding
  an immediate repeat.
- `rollMoodBank()` — used by the "How are you feeling today?" screen: rolls
  one random image per emotion (4 total), fresh every time the screen mounts.
- `rollRoundImages(emotions)` — used by the game: rolls one random image per
  option in a round. This is lifted to `App.tsx` state and rolled **once per
  round** (`useEffect` keyed on `currentRound`), then passed down to the
  round screen, the loading screen, and whichever result screen follows —
  so the exact photo the child tapped is still the one shown on the
  correct/wrong screen, including in the AI-vision heatmap overlay.

If you want different re-roll behavior (e.g. reroll on every render, or
persist a session's picks to localStorage/sessionStorage — note: **not**
supported inside Claude artifacts, but fine in this standalone app), that
logic lives entirely in this one file.

## Backgrounds

The original dataset photos are on a flat gray studio background (fully
opaque, not real transparency). `scripts/remove_bg.py` produced the
transparent PNGs now sitting in `public/images/characters/` — rerun it if
you regenerate the dataset. **Your original `test/` dataset was never
modified** — this only affects a separate copy used by the UI, so nothing
in the MediaPipe/model training pipeline is touched.

## The model — current mock, and what to do when it's ready

`src/lib/mockModel.ts` exports `predictEmotion(trueEmotion)`. Right now it
doesn't run any real inference — it fakes a correct prediction (since we
already know which emotion folder the tapped image came from) with a
plausible confidence score and a short delay, so the full
tap → "Emo is thinking..." → result flow works end-to-end. This is called
from `LoadingScreen.tsx`, the single place wired to the model.

When your real classifier is trained, you have two integration options:

1. **Client-side (TensorFlow.js / ONNX Runtime Web)** — only clean if the
   whole pipeline is one exportable neural net. Your fusion approach
   combines a MobileNetV2 CNN branch with a scikit-learn Random Forest on
   MediaPipe pose features; sklearn models don't convert to TFJS/ONNX
   painlessly, so this path means re-implementing the RF (or swapping it for
   a small neural head) just to make it portable.

2. **Server-side (recommended)** — a small FastAPI service that loads your
   saved MobileNetV2 + Random Forest + fusion-weight artifacts as-is,
   exposes one `POST /predict` endpoint (image + pose landmarks in,
   `{emotion, confidence}` out), and gets called from `mockModel.ts` with
   `fetch()`. Your training code and inference code stay identical, and the
   only frontend change is the body of `predictEmotion` — no screen or state
   logic needs to change.

## Known simplifications

- `ProfileScreen` and `ParentScreen` still show hardcoded sample session
  history/scores (this was already the case in the original design) — wire
  these up once you have a backend/store for real session data.
- `PinScreen`'s PIN is hardcoded to `1234` in the component, same as before.

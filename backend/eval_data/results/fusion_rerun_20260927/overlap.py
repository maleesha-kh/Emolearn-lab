"""
Checks the evaluation images for overlap with local training images: exact
byte match (SHA-256), plus near-duplicates by dHash Hamming distance and the
mean absolute difference of 32x32 greyscale thumbnails (both composited on
white). Also records which image generator's C2PA credentials each file carries.

Usage (from backend/, venv active):
    python eval_data/results/fusion_rerun_20260927/overlap.py

FERG-DB and the Stage 2 face crops live only on Google Drive and are not checked.
The Downloads folders are the user's local copies of the fine-tune split and the
old face test set; they are skipped if missing.
"""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

OUT_DIR = Path(__file__).resolve().parent
REPO = Path(__file__).resolve().parents[4]
DOWNLOADS = Path.home() / "Downloads"
SUFFIXES = {".png", ".jpg", ".jpeg"}

EVAL = {
    "fusion_test": REPO / "backend/eval_data/fusion_test",
    "game": REPO / "frontend/public/images/characters",
}
TRAIN = {
    "pose_raw_128": REPO / "backend/app/ml/pose_branch/data/raw_images",
    "pose_bg_removed_128": REPO / "backend/app/ml/pose_branch/data/raw_images_bg_removed",
    "fixed_split_train": DOWNLOADS / "fixed_train_test_split/fixed_split/new_images_for_train",
    "fixed_split_test": DOWNLOADS / "fixed_train_test_split/fixed_split/new_images_for_fixed_test",
    "downloads_test2": DOWNLOADS / "test2",
}
PROVENANCE_ONLY = {"game_images_raw": REPO / "game_images_raw"}


def files(root: Path):
    return sorted(p for p in root.rglob("*") if p.suffix.lower() in SUFFIXES)


def generator(raw: bytes) -> str:
    if b"gpt-image" in raw or b"OpenAI Media" in raw:
        return "openai"
    if b"Google Generative AI" in raw:
        return "google"
    return "none"


def signature(path: Path):
    raw = path.read_bytes()
    img = Image.open(path).convert("RGBA")
    bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
    bg.paste(img, (0, 0), img)
    grey = bg.convert("L")
    small = np.asarray(grey.resize((9, 8), Image.LANCZOS), dtype=float)
    return {
        "sha": hashlib.sha256(raw).hexdigest(),
        "dhash": (small[:, 1:] > small[:, :-1]).flatten(),
        "thumb": np.asarray(grey.resize((32, 32), Image.LANCZOS), dtype=float) / 255.0,
        "generator": generator(raw),
    }


def main():
    sigs, skipped = {}, []
    for name, root in {**EVAL, **TRAIN, **PROVENANCE_ONLY}.items():
        if not root.exists():
            skipped.append(name)
            continue
        sigs[name] = {p.relative_to(root).as_posix(): signature(p) for p in files(root)}
        print(f"{name}: {len(sigs[name])} images")

    train_sets = [t for t in TRAIN if t in sigs]
    matches = []
    for ev in EVAL:
        for fname, es in sigs[ev].items():
            candidates = []
            for tr in train_sets:
                for tfile, ts in sigs[tr].items():
                    mad = float(np.abs(es["thumb"] - ts["thumb"]).mean())
                    ham = int((es["dhash"] != ts["dhash"]).sum())
                    candidates.append((mad, ham, tr, tfile, es["sha"] == ts["sha"]))
            candidates.sort()
            matches.append({
                "eval_set": ev,
                "file": fname,
                "exact_match": any(c[4] for c in candidates),
                "nearest": [
                    {"set": t, "file": f, "thumb_mad": round(m, 4), "dhash_hamming": h, "identical_bytes": s}
                    for m, h, t, f, s in candidates[:3]
                ],
            })

    provenance = {}
    for name, group in sigs.items():
        counts = {}
        for s in group.values():
            counts[s["generator"]] = counts.get(s["generator"], 0) + 1
        provenance[name] = counts

    result = {
        "method": "sha256 exact match; nearest by 32x32 greyscale thumbnail mean abs diff (0-1), with 64-bit dHash Hamming distance",
        "train_sets_checked": {t: str(TRAIN[t]) for t in train_sets},
        "skipped_missing": skipped,
        "not_checked": ["FERG-DB (Google Drive only)", "Stage 2 face crops (Google Drive only)"],
        "c2pa_generator_counts": provenance,
        "exact_matches": sum(m["exact_match"] for m in matches),
        "matches": matches,
    }
    with open(OUT_DIR / "overlap.json", "w") as fh:
        json.dump(result, fh, indent=2)
    print(f"exact matches: {result['exact_matches']}")


if __name__ == "__main__":
    main()

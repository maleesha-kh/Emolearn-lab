"""
Sanity-checks the exact production pipeline against every character image
frontend/src/lib/imageBank.ts can pick, so a broken or misclassified asset
shows up here before a child sees it in the game.

Mirrors imageBank.ts's own path construction (VARIANTS_PER_EMOTION and its
fileName() pattern) instead of importing it, since this is a Python script
running against the backend venv, not a Node process — keep the two in sync
by hand if imageBank.ts changes.

Usage: python scripts/check_image_bank.py
"""
import sys
from pathlib import Path

from PIL import Image, UnidentifiedImageError

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.fusion import fuse_predictions
from app.ml.face_branch.crop import crop_face
from app.ml.face_branch.inference import predict_face
from app.ml.pipeline import downscale
from app.ml.pose_branch.inference import predict_pose_from_landmarks
from app.ml.preprocessing import prepare_image

FRONTEND_PUBLIC = Path(__file__).resolve().parent.parent.parent / "frontend" / "public"

# Mirrors frontend/src/lib/imageBank.ts's VARIANTS_PER_EMOTION and fileName()
VARIANTS_PER_EMOTION = {"happy": 8, "sad": 8, "angry": 8, "surprised": 8}


def image_bank_paths():
    """Yields (intended_emotion, local_path) for every image imageBank.ts can pick."""
    for emotion, count in VARIANTS_PER_EMOTION.items():
        for variant in range(1, count + 1):
            web_path = f"images/characters/{emotion}/{emotion}_v{variant}_5.png"
            yield emotion, FRONTEND_PUBLIC / web_path


def run_pipeline(path: Path) -> dict:
    """Runs the same steps as the /predict route on one image, stopping at the first failure."""
    row = {"predicted": "-", "confidence": "-", "mode": "-", "failed_step": ""}

    try:
        pil_image = downscale(Image.open(path).convert("RGB"))
    except UnidentifiedImageError as e:
        row["failed_step"] = f"open image: {e}"
        return row

    try:
        prepared = prepare_image(pil_image)
    except Exception as e:
        row["failed_step"] = f"prepare_image: {e}"
        return row

    try:
        face_crop = crop_face(prepared.rgba, prepared.landmarks)
    except Exception as e:
        row["failed_step"] = f"crop_face: {e}"
        return row

    try:
        face_probs = predict_face(face_crop)
    except Exception as e:
        row["failed_step"] = f"predict_face: {e}"
        return row

    try:
        pose_probs = predict_pose_from_landmarks(prepared.landmarks)
    except Exception as e:
        row["failed_step"] = f"predict_pose_from_landmarks: {e}"
        return row

    try:
        fused = fuse_predictions(face_probs, pose_probs, prepared.landmarks)
    except Exception as e:
        row["failed_step"] = f"fuse_predictions: {e}"
        return row

    row["predicted"] = fused.emotion
    row["confidence"] = f"{fused.confidence:.4f}"
    row["mode"] = fused.mode
    return row


def main():
    print(f"{'image':30s}{'intended':12s}{'predicted':12s}{'confidence':12s}{'mode':12s}{'failed step'}")

    total = failures = mismatches = 0

    for emotion, path in image_bank_paths():
        total += 1

        if not path.exists():
            print(f"{path.name:30s}{emotion:12s}{'-':12s}{'-':12s}{'-':12s}file not found: {path}")
            failures += 1
            continue

        row = run_pipeline(path)
        print(f"{path.name:30s}{emotion:12s}{row['predicted']:12s}{row['confidence']:12s}{row['mode']:12s}{row['failed_step']}")

        if row["failed_step"]:
            failures += 1
        elif row["predicted"] != emotion:
            mismatches += 1

    print()
    print(f"{total} images checked, {failures} failed a pipeline step, "
          f"{mismatches} predicted a different emotion than intended")


if __name__ == "__main__":
    main()

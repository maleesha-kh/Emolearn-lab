"""
Sends every game image in frontend/public/images/characters/<emotion>/ to the
running /predict endpoint and prints how often it gets the intended emotion,
split into old dataset images (<emotion>_v<n>_5.png) and new game images
(<emotion>_game_NN.png).

The server does not return its face crop or whether pose landmarks were
found, so each image is also run locally through the same backend code as
the /predict route. That local run saves the face crop to
eval_crops/<emotion>/, gives crop_method (landmarks, or fallback when no pose
was detected), and its prediction is compared with the server's in
matches_server. If every row matches, the saved crops are the ones the
server used.

Usage (from backend, with the venv active and the server running):
    python check_game_images.py [--url http://127.0.0.1:8000]
"""
import argparse
import io
import json
import sys
import urllib.error
import urllib.request
import uuid
from pathlib import Path

import numpy as np
from PIL import Image

from app.api.routes.predict import MIN_CHARACTER_ALPHA_FRACTION
from app.core.fusion import fuse_predictions
from app.ml.face_branch.crop import crop_face_with_box
from app.ml.face_branch.inference import predict_face
from app.ml.pipeline import downscale
from app.ml.pose_branch.inference import predict_pose_from_landmarks
from app.ml.preprocessing import prepare_image

BACKEND_DIR = Path(__file__).resolve().parent
CHARACTERS_DIR = BACKEND_DIR.parent / "frontend" / "public" / "images" / "characters"
CROPS_DIR = BACKEND_DIR / "eval_crops"
EMOTIONS = ["happy", "sad", "angry", "surprised"]


def predict_on_server(url: str, image_bytes: bytes) -> dict:
    """Posts the file the same way the frontend does (multipart field "file")."""
    boundary = uuid.uuid4().hex
    body = (
        f"--{boundary}\r\n"
        'Content-Disposition: form-data; name="file"; filename="character.png"\r\n'
        "Content-Type: image/png\r\n\r\n"
    ).encode() + image_bytes + f"\r\n--{boundary}--\r\n".encode()

    request = urllib.request.Request(
        f"{url}/predict",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    with urllib.request.urlopen(request) as response:
        return json.load(response)


def predict_locally(image_bytes: bytes):
    """Same steps as the /predict route. Returns (emotion, confidence, crop, crop_method)."""
    pil_image = downscale(Image.open(io.BytesIO(image_bytes)).convert("RGB"))
    prepared = prepare_image(pil_image)
    crop_method = "landmarks" if prepared.landmarks is not None else "fallback"

    alpha = np.array(prepared.rgba)[:, :, 3]
    if float((alpha > 128).mean()) < MIN_CHARACTER_ALPHA_FRACTION:
        return None, None, None, crop_method

    face_crop, _ = crop_face_with_box(prepared.rgba, prepared.landmarks)
    face_probs = predict_face(face_crop)
    pose_probs = predict_pose_from_landmarks(prepared.landmarks)
    fused = fuse_predictions(face_probs, pose_probs, prepared.landmarks)
    return fused.emotion, round(fused.confidence, 4), face_crop, crop_method


def game_images():
    """Yields (emotion, path, group) with old dataset images before new game images."""
    for emotion in EMOTIONS:
        paths = sorted((CHARACTERS_DIR / emotion).glob("*.png"))
        for group in ("old", "new"):
            for path in paths:
                if ("_game_" in path.name) == (group == "new"):
                    yield emotion, path, group


def accuracy_line(label: str, rows: list) -> str:
    if not rows:
        return f"{label:5s} no images"
    correct = sum(r["correct"] for r in rows)
    return f"{label:5s} {correct}/{len(rows)} = {correct / len(rows):.1%}"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:8000")
    args = parser.parse_args()

    header = f"{'file':26s}{'true':11s}{'predicted':11s}{'confidence':12s}{'correct':9s}{'crop_method':13s}{'matches_server'}"
    print(header)
    print("-" * len(header))

    rows = []
    for emotion, path, group in game_images():
        image_bytes = path.read_bytes()

        try:
            server = predict_on_server(args.url, image_bytes)
            predicted, confidence = server["emotion"], server["confidence"]
        except urllib.error.HTTPError as e:
            predicted, confidence = f"http {e.code}", None
        except urllib.error.URLError as e:
            sys.exit(f"Could not reach {args.url}/predict ({e.reason}). Is the backend running?")

        local_emotion, local_confidence, face_crop, crop_method = predict_locally(image_bytes)
        if face_crop is not None:
            crop_path = CROPS_DIR / emotion / path.name
            crop_path.parent.mkdir(parents=True, exist_ok=True)
            face_crop.save(crop_path)

        # Confidence is compared after the server's own 4-decimal rounding
        matches = local_emotion == predicted and local_confidence == confidence
        row = {"group": group, "correct": predicted == emotion, "matches": matches}
        rows.append(row)

        confidence_text = f"{confidence:.4f}" if confidence is not None else "-"
        print(
            f"{path.name:26s}{emotion:11s}{predicted:11s}{confidence_text:12s}"
            f"{'yes' if row['correct'] else 'no':9s}{crop_method:13s}{'yes' if matches else 'no'}"
        )

    print()
    print("Accuracy")
    print(accuracy_line("old", [r for r in rows if r["group"] == "old"]))
    print(accuracy_line("new", [r for r in rows if r["group"] == "new"]))
    print(accuracy_line("all", rows))
    print()
    matched = sum(r["matches"] for r in rows)
    print(f"Local run matches server: {matched}/{len(rows)}")
    if matched == len(rows):
        print(f"All match, so the crops in {CROPS_DIR} are the ones the server used.")
    else:
        print("Some rows differ from the server, so their saved crops may not be what the server used.")


if __name__ == "__main__":
    main()

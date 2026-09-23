"""
Grid-searches the face branch's softmax temperature that minimises negative
log-likelihood on eval_data/test_original, using the exact production
preprocessing (downscale, prepare_image, crop_face).

Only ever run against test_original. eval_data/fusion_test is held out for
the accuracy comparison in eval_fusion.py, not for tuning.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core import config
from app.ml.face_branch.crop import crop_face
from app.ml.face_branch.inference import face_logits
from app.ml.pipeline import downscale
from app.ml.preprocessing import prepare_image

TEST_DIR = Path(__file__).resolve().parent.parent / "eval_data" / "test_original"
IMAGE_SUFFIXES = (".png", ".jpg", ".jpeg")
T_MIN, T_MAX, T_STEP = 0.5, 30.0, 0.25


def collect_logits():
    all_logits = []
    all_labels = []

    for class_index, label in enumerate(config.EMOTION_CLASSES):
        class_dir = TEST_DIR / label
        for img_path in sorted(class_dir.iterdir()):
            if img_path.suffix.lower() not in IMAGE_SUFFIXES:
                continue
            pil_image = downscale(Image.open(img_path).convert("RGB"))
            prepared = prepare_image(pil_image)
            face_crop = crop_face(prepared.rgba, prepared.landmarks)
            all_logits.append(face_logits(face_crop))
            all_labels.append(class_index)

    return np.array(all_logits), np.array(all_labels)


def negative_log_likelihood(logits: np.ndarray, labels: np.ndarray, temperature: float) -> float:
    scaled = logits / temperature
    shifted = scaled - scaled.max(axis=1, keepdims=True)
    exp = np.exp(shifted)
    probs = exp / exp.sum(axis=1, keepdims=True)
    true_probs = probs[np.arange(len(labels)), labels]
    return float(-np.mean(np.log(true_probs)))


def main():
    logits, labels = collect_logits()
    print(f"collected logits for {len(labels)} images from {TEST_DIR}")

    best_t, best_nll = 1.0, float("inf")
    for t in np.arange(T_MIN, T_MAX + 1e-9, T_STEP):
        nll = negative_log_likelihood(logits, labels, t)
        if nll < best_nll:
            best_t, best_nll = t, nll

    print(f"best T = {best_t:.2f} (negative log-likelihood = {best_nll:.4f})")
    print(f"T = 1.00 negative log-likelihood = {negative_log_likelihood(logits, labels, 1.0):.4f}")


if __name__ == "__main__":
    main()

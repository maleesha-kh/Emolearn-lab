"""
Evaluates the production pipeline (prepare_image -> crop_face -> predict_face
-> predict_pose_from_landmarks -> fuse_predictions) on a held-out test set,
and reports face-only, pose-only and fused accuracy on the same images.

Usage:
    python eval_fusion.py --test_dir eval_data/fusion_test

Expected folder layout:
    fusion_test/
        angry/      *.png / *.jpg / *.jpeg
        happy/      ...
        sad/        ...
        surprised/  ...
"""
import argparse
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)

from app.core import config
from app.core.fusion import fuse_predictions
from app.ml.face_branch.crop import crop_face
from app.ml.face_branch.inference import predict_face
from app.ml.pipeline import downscale
from app.ml.pose_branch.inference import predict_pose_from_landmarks
from app.ml.preprocessing import prepare_image

IMAGE_SUFFIXES = (".png", ".jpg", ".jpeg")
NO_POSE_LABEL = "none"  # stands in for pose_probs is None, always counts as wrong


def load_test_set(test_dir: str):
    """Yields (pil_image, true_label, filename) for every image under test_dir/<class>/."""
    for label in config.EMOTION_CLASSES:
        class_dir = Path(test_dir) / label
        if not class_dir.exists():
            print(f"no folder found for class '{label}' at {class_dir}")
            continue
        for img_path in sorted(class_dir.iterdir()):
            if img_path.suffix.lower() not in IMAGE_SUFFIXES:
                continue
            yield Image.open(img_path).convert("RGB"), label, img_path.name


def predict_one(pil_image: Image.Image):
    """Runs the same steps as the /predict route on one image and returns (face_probs, pose_probs, fused)."""
    pil_image = downscale(pil_image)
    prepared = prepare_image(pil_image)
    face_crop = crop_face(prepared.rgba, prepared.landmarks)

    face_probs = predict_face(face_crop)
    pose_probs = predict_pose_from_landmarks(prepared.landmarks)
    fused = fuse_predictions(face_probs, pose_probs, prepared.landmarks)

    return face_probs, pose_probs, fused


def evaluate_fusion(test_dir: str):
    out_dir = Path("eval_data") / "results" / Path(test_dir).name
    out_dir.mkdir(parents=True, exist_ok=True)

    y_true, y_face, y_pose, y_fused, modes = [], [], [], [], []
    rows = []

    for pil_image, true_label, fname in load_test_set(test_dir):
        face_probs, pose_probs, fused = predict_one(pil_image)

        face_emotion = max(face_probs, key=face_probs.get)
        pose_emotion = max(pose_probs, key=pose_probs.get) if pose_probs is not None else NO_POSE_LABEL

        y_true.append(true_label)
        y_face.append(face_emotion)
        y_pose.append(pose_emotion)
        y_fused.append(fused.emotion)
        modes.append(fused.mode)

        rows.append((fname, true_label, face_emotion, pose_emotion, fused.emotion, fused.mode))

    print(f"{'filename':30s}{'true':12s}{'face':12s}{'pose':12s}{'fused':12s}{'mode':10s}")
    for fname, true_label, face_emotion, pose_emotion, fused_emotion, mode in rows:
        print(f"{fname:30s}{true_label:12s}{face_emotion:12s}{pose_emotion:12s}{fused_emotion:12s}{mode:10s}")

    face_only_count = modes.count("face_only")
    print(f"\n{face_only_count} / {len(modes)} images used face_only mode.\n")

    results = {
        "test_dir": test_dir,
        "total_images": len(y_true),
        "face_only_mode_count": face_only_count,
        "branches": {},
    }

    branch_specs = [
        ("face", y_face, config.EMOTION_CLASSES),
        ("pose", y_pose, config.EMOTION_CLASSES + [NO_POSE_LABEL]),
        ("fused", y_fused, config.EMOTION_CLASSES),
    ]

    for name, y_pred, labels in branch_specs:
        acc = accuracy_score(y_true, y_pred)
        macro_f1 = f1_score(y_true, y_pred, average="macro", labels=config.EMOTION_CLASSES, zero_division=0)
        report = classification_report(y_true, y_pred, labels=labels, zero_division=0, output_dict=True)
        matrix = confusion_matrix(y_true, y_pred, labels=labels)

        print(f"\n--- {name} ---")
        print(f"accuracy: {acc:.4f}")
        print(f"macro f1: {macro_f1:.4f}")
        print(classification_report(y_true, y_pred, labels=labels, zero_division=0))
        print("confusion matrix (rows=true, cols=pred), labels order:", labels)
        print(matrix)

        results["branches"][name] = {
            "labels": labels,
            "accuracy": float(acc),
            "macro_f1": float(macro_f1),
            "classification_report": report,
            "confusion_matrix": matrix.tolist(),
        }

        save_confusion_matrix_png(matrix, labels, name, out_dir)

    results_path = out_dir / "fusion_results.json"
    with open(results_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved results to {results_path}")


def save_confusion_matrix_png(matrix, labels, name: str, out_dir: Path):
    display = ConfusionMatrixDisplay(matrix, display_labels=labels)
    display.plot(cmap="Blues", values_format="d")
    plt.title(f"{name} confusion matrix")
    out_path = out_dir / f"confusion_matrix_{name}.png"
    plt.savefig(out_path, bbox_inches="tight")
    plt.close()
    print(f"Saved {out_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--test_dir", default="eval_data/fusion_test", help="Path to the test set folder (class subfolders inside)")
    args = parser.parse_args()
    evaluate_fusion(args.test_dir)

"""
Reruns the fusion evaluation with the current models on the 24 full-body
test images and the 72 game images (all, old v*_5, new *_game_), and writes
metrics, confusion matrices, per-image predictions and fix/break counts.

Usage (from backend/, venv active):
    python eval_data/results/fusion_rerun_20260927/rerun_fusion.py
"""
import json
import sys
from datetime import datetime
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(BACKEND_DIR))

import matplotlib
matplotlib.use("Agg")
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, precision_recall_fscore_support

from app.core import config
from app.core.fusion import FUSION_WEIGHTS
from eval_fusion import NO_POSE_LABEL, load_test_set, predict_one, save_confusion_matrix_png

OUT_DIR = Path(__file__).resolve().parent
FUSION_TEST_DIR = BACKEND_DIR / "eval_data" / "fusion_test"
GAME_DIR = BACKEND_DIR.parent / "frontend" / "public" / "images" / "characters"
BRANCHES = ("face", "pose", "fused")


def predict_set(test_dir: Path):
    rows = []
    for img, label, fname in load_test_set(str(test_dir)):
        face_probs, pose_probs, fused = predict_one(img)
        rows.append({
            "file": f"{label}/{fname}",
            "true": label,
            "face": max(face_probs, key=face_probs.get),
            "pose": max(pose_probs, key=pose_probs.get) if pose_probs is not None else NO_POSE_LABEL,
            "fused": fused.emotion,
            "mode": fused.mode,
        })
    return rows


def fix_break(rows):
    def right(r, b):
        return r[b] == r["true"]

    def files(cond):
        return [r["file"] for r in rows if cond(r)]

    fixed = files(lambda r: right(r, "fused") and not (right(r, "face") and right(r, "pose")))
    broke = files(lambda r: not right(r, "fused") and (right(r, "face") or right(r, "pose")))
    return {
        "fixed_count": len(fixed),
        "broke_count": len(broke),
        "fixed": fixed,
        "broke": broke,
        "vs_face": {
            "fixed": files(lambda r: right(r, "fused") and not right(r, "face")),
            "broke": files(lambda r: not right(r, "fused") and right(r, "face")),
        },
        "vs_pose": {
            "fixed": files(lambda r: right(r, "fused") and not right(r, "pose")),
            "broke": files(lambda r: not right(r, "fused") and right(r, "pose")),
        },
        "both_branches_right": len(files(lambda r: right(r, "face") and right(r, "pose"))),
        "all_three_wrong": len(files(lambda r: not (right(r, "face") or right(r, "pose") or right(r, "fused")))),
    }


def evaluate(name, test_dir, rows):
    out_dir = OUT_DIR / name
    out_dir.mkdir(parents=True, exist_ok=True)
    y_true = [r["true"] for r in rows]
    result = {
        "test_dir": test_dir,
        "total_images": len(rows),
        "face_only_mode_count": sum(r["mode"] == "face_only" for r in rows),
        "face_only_files": [r["file"] for r in rows if r["mode"] == "face_only"],
        "branches": {},
        "fusion_fixed_broke": fix_break(rows),
        "per_image": rows,
    }
    for branch in BRANCHES:
        y_pred = [r[branch] for r in rows]
        labels = config.EMOTION_CLASSES + ([NO_POSE_LABEL] if branch == "pose" else [])
        p, r, f, _ = precision_recall_fscore_support(
            y_true, y_pred, labels=config.EMOTION_CLASSES, average="macro", zero_division=0)
        matrix = confusion_matrix(y_true, y_pred, labels=labels)
        result["branches"][branch] = {
            "labels": labels,
            "accuracy": float(accuracy_score(y_true, y_pred)),
            # Macro averages over the four emotions only, never the "none" pose label
            "macro_precision": float(p),
            "macro_recall": float(r),
            "macro_f1": float(f),
            "classification_report": classification_report(
                y_true, y_pred, labels=labels, zero_division=0, output_dict=True),
            "confusion_matrix": matrix.tolist(),
        }
        save_confusion_matrix_png(matrix, labels, branch, out_dir)
    with open(out_dir / "fusion_results.json", "w") as fh:
        json.dump(result, fh, indent=2)
    return result


def main():
    fusion_rows = predict_set(FUSION_TEST_DIR)
    game_rows = predict_set(GAME_DIR)
    sets = {
        "fusion_test": ("backend/eval_data/fusion_test", fusion_rows),
        "game_all": ("frontend/public/images/characters", game_rows),
        "game_old": ("frontend/public/images/characters (*_v*_5.png)", [r for r in game_rows if "_v" in r["file"]]),
        "game_new": ("frontend/public/images/characters (*_game_*.png)", [r for r in game_rows if "_game_" in r["file"]]),
    }

    metrics = {
        "run_at": datetime.now().isoformat(timespec="seconds"),
        "fusion_weights": {
            "Wf": FUSION_WEIGHTS["face"],
            "Wp": FUSION_WEIGHTS["pose"],
            "source": "computed in app/core/fusion.py as Wi = Ai / (Af + Ap) from config values",
            "Af_FACE_BRANCH_ACCURACY": config.FACE_BRANCH_ACCURACY,
            "Ap_POSE_BRANCH_ACCURACY": config.POSE_BRANCH_ACCURACY,
        },
        "sets": {},
    }
    for name, (test_dir, rows) in sets.items():
        res = evaluate(name, test_dir, rows)
        metrics["sets"][name] = {
            "total_images": res["total_images"],
            "face_only_mode_count": res["face_only_mode_count"],
            "fixed_count": res["fusion_fixed_broke"]["fixed_count"],
            "broke_count": res["fusion_fixed_broke"]["broke_count"],
            **{b: {k: res["branches"][b][k] for k in ("accuracy", "macro_precision", "macro_recall", "macro_f1")}
               for b in BRANCHES},
        }
        print(f"{name:12s} n={res['total_images']:3d} face_only={res['face_only_mode_count']}  " + "  ".join(
            f"{b}={res['branches'][b]['accuracy']:.3f}" for b in BRANCHES))

    with open(OUT_DIR / "metrics.json", "w") as fh:
        json.dump(metrics, fh, indent=2)


if __name__ == "__main__":
    main()

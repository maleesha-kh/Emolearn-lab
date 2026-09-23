"""
Standalone experiment: does removing the background before pose extraction
improve the Random Forest pose classifier?

Does not modify any existing model files or CSVs. Run from the pose_branch
directory (same convention as extract_keypoints.py / train_rf.py).
"""

import os
import cv2
import numpy as np
import pandas as pd
import joblib
import mediapipe as mp
from PIL import Image
from rembg import new_session, remove
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix

RAW_DIR = "data/raw_images"
BG_REMOVED_DIR = "data/raw_images_bg_removed"
ORIGINAL_CSV = "data/pose_keypoints.csv"
BG_REMOVED_CSV = "data/pose_keypoints_bg_removed.csv"
CLASSES = ["angry", "happy", "sad", "surprised"]


def remove_backgrounds():
    session = new_session("u2net")
    os.makedirs(BG_REMOVED_DIR, exist_ok=True)

    for cls in CLASSES:
        src_folder = os.path.join(RAW_DIR, cls)
        out_folder = os.path.join(BG_REMOVED_DIR, cls)
        os.makedirs(out_folder, exist_ok=True)

        for fname in os.listdir(src_folder):
            out_name = os.path.splitext(fname)[0] + ".png"
            out_path = os.path.join(out_folder, out_name)
            if os.path.exists(out_path):
                continue

            src_path = os.path.join(src_folder, fname)
            with Image.open(src_path) as img:
                img = img.convert("RGBA")
                cutout = remove(img, session=session)

            # flatten transparent result onto a white background
            flattened = Image.new("RGBA", cutout.size, (255, 255, 255, 255))
            flattened.paste(cutout, (0, 0), cutout)
            flattened = flattened.convert("RGB")
            flattened.save(out_path, "PNG")

        print(f"{cls}: background removal done")


def extract_keypoints(src_dir, out_csv=None):
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(static_image_mode=True, min_detection_confidence=0.5)

    rows = []
    no_landmark_count = 0

    for cls in CLASSES:
        folder = os.path.join(src_dir, cls)
        for fname in os.listdir(folder):
            img_path = os.path.join(folder, fname)
            img = cv2.imread(img_path)
            if img is None:
                continue

            results = pose.process(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
            if not results.pose_landmarks:
                no_landmark_count += 1
                continue

            keypoints = []
            for lm in results.pose_landmarks.landmark:
                keypoints.extend([lm.x, lm.y, lm.z, lm.visibility])

            row = {"filename": fname, "label": cls}
            for i, val in enumerate(keypoints):
                row[f"kp_{i}"] = val
            rows.append(row)

    pose.close()

    df = pd.DataFrame(rows)
    if out_csv:
        os.makedirs(os.path.dirname(out_csv), exist_ok=True)
        df.to_csv(out_csv, index=False)
    return df, no_landmark_count


def train_and_evaluate(df, model_path=None, encoder_path=None):
    X = df.drop(columns=["filename", "label"])
    y = df["label"]

    le = LabelEncoder()
    y_encoded = le.fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )

    clf = RandomForestClassifier(n_estimators=200, max_depth=10, random_state=42)
    cv_scores = cross_val_score(clf, X_train, y_train, cv=5)

    clf.fit(X_train, y_train)
    y_pred = clf.predict(X_test)

    report = classification_report(y_test, y_pred, target_names=le.classes_)
    matrix = confusion_matrix(y_test, y_pred)
    accuracy = clf.score(X_test, y_test)

    if model_path and encoder_path:
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        joblib.dump(clf, model_path)
        joblib.dump(le, encoder_path)

    return {
        "cv_mean": cv_scores.mean(),
        "cv_std": cv_scores.std(),
        "accuracy": accuracy,
        "report": report,
        "matrix": matrix,
    }


def print_comparison(original, bg_removed, orig_missing, bg_missing):
    print("\n" + "=" * 60)
    print("COMPARISON: original vs background-removed")
    print("=" * 60)

    print(f"\n{'Metric':<25}{'Original':<20}{'BG Removed':<20}")
    print(f"{'CV mean':<25}{original['cv_mean']:<20.3f}{bg_removed['cv_mean']:<20.3f}")
    print(f"{'CV std':<25}{original['cv_std']:<20.3f}{bg_removed['cv_std']:<20.3f}")
    print(f"{'Held-out accuracy':<25}{original['accuracy']:<20.3f}{bg_removed['accuracy']:<20.3f}")
    print(f"{'No landmarks detected':<25}{orig_missing:<20}{bg_missing:<20}")

    print("\n--- Original: classification report ---")
    print(original["report"])
    print("--- Original: confusion matrix ---")
    print(original["matrix"])

    print("\n--- BG Removed: classification report ---")
    print(bg_removed["report"])
    print("--- BG Removed: confusion matrix ---")
    print(bg_removed["matrix"])


def main():
    print("Step 1: removing backgrounds...")
    remove_backgrounds()

    print("\nStep 2: extracting keypoints from bg-removed images...")
    bg_df, bg_missing = extract_keypoints(BG_REMOVED_DIR, BG_REMOVED_CSV)
    print(f"Saved {len(bg_df)} rows to {BG_REMOVED_CSV}")

    print("\nStep 3: loading original keypoints CSV and re-running detection to count missing landmarks...")
    orig_df = pd.read_csv(ORIGINAL_CSV)
    _, orig_missing = extract_keypoints(RAW_DIR)

    print("\nStep 4: training and evaluating on both datasets...")
    original_results = train_and_evaluate(orig_df)
    bg_results = train_and_evaluate(
        bg_df,
        model_path="models/random_forest_pose_model_bg_removed.pkl",
        encoder_path="models/label_encoder_bg_removed.pkl",
    )

    print_comparison(original_results, bg_results, orig_missing, bg_missing)
    print("\nSaved bg-removed model to models/random_forest_pose_model_bg_removed.pkl")
    print("Saved bg-removed label encoder to models/label_encoder_bg_removed.pkl")


if __name__ == "__main__":
    main()

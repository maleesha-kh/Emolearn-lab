import os
import cv2
import mediapipe as mp
import pandas as pd

mp_pose = mp.solutions.pose
pose = mp_pose.Pose(static_image_mode=True, min_detection_confidence=0.5)

# ඔබේ train folder එකේ path එක - Dataset folder එකේ path එකට update කරන්න
SRC_DIR = r"D:\...\Dataset\pose_dataset_nobg\train"
OUT_CSV = "data/pose_keypoints.csv"
classes = ["angry", "happy", "sad", "surprised"]

rows = []

for cls in classes:
    folder = os.path.join(SRC_DIR, cls)
    for fname in os.listdir(folder):
        img_path = os.path.join(folder, fname)
        img = cv2.imread(img_path)
        if img is None:
            continue

        results = pose.process(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
        if not results.pose_landmarks:
            print(f"No landmarks detected: {fname}")
            continue

        keypoints = []
        for lm in results.pose_landmarks.landmark:
            keypoints.extend([lm.x, lm.y, lm.z, lm.visibility])

        row = {"filename": fname, "label": cls}
        for i, val in enumerate(keypoints):
            row[f"kp_{i}"] = val
        rows.append(row)

    count = len([r for r in rows if r["label"] == cls])
    print(f"{cls}: {count} images processed")

os.makedirs("data", exist_ok=True)
df = pd.DataFrame(rows)
df.to_csv(OUT_CSV, index=False)
print(f"\n✅ Saved {len(df)} rows to {OUT_CSV}")
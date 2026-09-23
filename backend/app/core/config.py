"""Central configuration: model paths and constants shared across both branches."""
import os

# Absolute path of the app/ folder (derived from this file's own location)
APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------------------------------------------------------------------------
# Pose branch (MediaPipe + Random Forest)
# ---------------------------------------------------------------------------
POSE_MODEL_PATH = os.path.join(APP_DIR, "ml", "pose_branch", "models", "random_forest_pose_model_bg_removed.pkl")
POSE_LABEL_ENCODER_PATH = os.path.join(APP_DIR, "ml", "pose_branch", "models", "label_encoder_bg_removed.pkl")

# ---------------------------------------------------------------------------
# Shared preprocessing (background removal, used by both branches)
# ---------------------------------------------------------------------------
REMBG_MODEL = "u2net"
FACE_BG_COLOR = (255, 255, 255)
POSE_INPUT_MODE = "bg_removed"  # "bg_removed" or "original" — which image MediaPipe runs on

# When true, each request saves rgba/face_crop/heatmap to backend/debug_outputs/
DEBUG_SAVE_IMAGES = False

# ---------------------------------------------------------------------------
# Face branch (MobileNetV2)
# ---------------------------------------------------------------------------
FACE_MODEL_PATH = os.path.join(
    APP_DIR, "ml", "face_branch", "models", "face_branch_v4_clean.weights.h5"
)

FACE_IMG_SIZE = 224

# Softens predict_face()'s softmax so the pose branch can still shift the
# fused result. Chosen by scripts/calibrate_face_temperature.py; T=4 was
# tried but didn't raise fused accuracy on eval_data/fusion_test, so this
# stays at 1.0 (no scaling).
FACE_TEMPERATURE = 1.0

# Must match the training architecture's last conv layer, or Grad-CAM will
# raise "no such layer". Find it with model.summary() if the model changes.
FACE_LAST_CONV_LAYER = "Conv_1"

EMOTION_CLASSES = ["angry", "happy", "sad", "surprised"]

# ---------------------------------------------------------------------------
# Accuracy-Weighted Late Fusion — Wi = Ai / (Af + Ap)
# Face accuracy is from the original held-out test set (31 images), not the
# smaller curated set (9 images) — larger sample, more reliable weight.
# ---------------------------------------------------------------------------
FACE_BRANCH_ACCURACY = 0.5833  # Af
POSE_BRANCH_ACCURACY = 0.9615  # Ap

# Below this mean visibility across POSE_VISIBILITY_LANDMARKS, the pose
# branch is treated as unreliable and fusion falls back to face only.
POSE_MIN_VISIBILITY = 0.5
POSE_VISIBILITY_LANDMARKS = [11, 12, 13, 14, 15, 16, 23, 24]

# The pose model was trained only on full-body images, so a partial-body
# pose (e.g. arms visible but hips cropped out) is out of distribution and
# treated as unreliable — require all of POSE_VISIBILITY_LANDMARKS to land
# inside the image (0 <= x <= 1 and 0 <= y <= 1).
POSE_MIN_IN_FRAME = 8

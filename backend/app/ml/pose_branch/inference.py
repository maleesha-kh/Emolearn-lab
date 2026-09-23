"""
Pose branch inference — gets an emotion probability from the saved Random
Forest model, given MediaPipe landmarks the shared preprocessing pipeline
already computed.
"""
from typing import Dict, List, Optional

import joblib
import pandas as pd

from app.core import config

# Module-level cache — the model is loaded once per process
# (loading it on every request would be very slow)
_pose_model = None
_label_encoder = None


def load_pose_model():
    """Call this during the FastAPI startup event — caches both models in memory."""
    global _pose_model, _label_encoder
    if _pose_model is None:
        _pose_model = joblib.load(config.POSE_MODEL_PATH)
        _label_encoder = joblib.load(config.POSE_LABEL_ENCODER_PATH)
    return _pose_model, _label_encoder


def predict_pose_from_landmarks(landmarks) -> Optional[Dict[str, float]]:
    """Returns a probability dict like {"angry": 0.1, ...}, or None if landmarks is None."""
    if landmarks is None:
        return None

    keypoints: List[float] = []
    for lm in landmarks:
        keypoints.extend([lm.x, lm.y, lm.z, lm.visibility])
    return _predict_from_keypoints(keypoints)


def _predict_from_keypoints(keypoints: List[float]) -> Dict[str, float]:
    model, label_encoder = load_pose_model()

    # The RF model was trained on a DataFrame with column names kp_0...kp_131
    # — the column names must match exactly at inference time too.
    columns = [f"kp_{i}" for i in range(len(keypoints))]
    x = pd.DataFrame([keypoints], columns=columns)

    probs = model.predict_proba(x)[0]
    class_labels = label_encoder.classes_

    return {label: float(p) for label, p in zip(class_labels, probs)}

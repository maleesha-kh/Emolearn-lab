"""Accuracy-weighted late fusion of the face and pose branch predictions."""
from dataclasses import dataclass
from typing import Dict, List, Optional

from app.core import config

FUSION_WEIGHTS = {
    "face": config.FACE_BRANCH_ACCURACY / (config.FACE_BRANCH_ACCURACY + config.POSE_BRANCH_ACCURACY),
    "pose": config.POSE_BRANCH_ACCURACY / (config.FACE_BRANCH_ACCURACY + config.POSE_BRANCH_ACCURACY),
}


@dataclass
class FusionResult:
    emotion: str
    confidence: float
    fused_probs: Dict[str, float]
    mode: str
    weights: Dict[str, float]


def pose_is_reliable(landmarks: Optional[List]) -> bool:
    """False unless the tracked landmarks are both visible and mostly inside the frame."""
    if landmarks is None:
        return False

    tracked = [landmarks[i] for i in config.POSE_VISIBILITY_LANDMARKS]
    mean_visibility = sum(lm.visibility for lm in tracked) / len(tracked)
    in_frame_count = sum(1 for lm in tracked if 0 <= lm.x <= 1 and 0 <= lm.y <= 1)

    return mean_visibility >= config.POSE_MIN_VISIBILITY and in_frame_count >= config.POSE_MIN_IN_FRAME


def _read_class_probs(probs: Dict[str, float]) -> Dict[str, float]:
    result = {}
    for emotion in config.EMOTION_CLASSES:
        if emotion not in probs:
            raise ValueError(f"missing class '{emotion}' in prediction dict")
        result[emotion] = probs[emotion]
    return result


def fuse_predictions(
    face_probs: Dict[str, float],
    pose_probs: Optional[Dict[str, float]],
    landmarks: Optional[List],
) -> FusionResult:
    face = _read_class_probs(face_probs)

    if pose_probs is None or not pose_is_reliable(landmarks):
        emotion = max(face, key=face.get)
        return FusionResult(
            emotion=emotion,
            confidence=face[emotion],
            fused_probs=face,
            mode="face_only",
            weights={"face": 1.0, "pose": 0.0},
        )

    pose = _read_class_probs(pose_probs)
    weights = FUSION_WEIGHTS

    fused = {
        emotion: weights["face"] * face[emotion] + weights["pose"] * pose[emotion]
        for emotion in config.EMOTION_CLASSES
    }
    emotion = max(fused, key=fused.get)

    return FusionResult(
        emotion=emotion,
        confidence=fused[emotion],
        fused_probs=fused,
        mode="fused",
        weights=weights,
    )

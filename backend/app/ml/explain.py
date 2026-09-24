"""
Explainable-AI (XAI) reasoning for a single prediction.

Turns the evidence the two branches actually used into a short,
child-friendly explanation, so the "why" changes with every image instead
of being a fixed sentence per round:

- Face branch: the raw Grad-CAM map is scored over facial regions
  (eyebrows, eyes, mouth, ...) located from the MediaPipe face landmarks,
  giving "where the face model looked hardest".
- Pose branch: occlusion sensitivity — each body-part group of landmarks is
  replaced with the training-set average and the drop in the predicted
  class probability is measured, giving "which body part mattered most".
  Simple geometric cues (hands by the face, arms crossed, head down, ...)
  describe what that body part was actually doing.
- Fusion: whether the two branches agreed, and how confident the result is.

Everything here is plain numpy so it can be unit-tested without TensorFlow
or MediaPipe; the model calls are passed in by the caller.
"""
from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional, Sequence, Tuple

import numpy as np

# Crop box in full-image pixels: (x1, y1, x2, y2)
Box = Tuple[int, int, int, int]

# MediaPipe Pose landmark indices
NOSE = 0
LEFT_EYE, RIGHT_EYE = 2, 5
MOUTH_LEFT, MOUTH_RIGHT = 9, 10
LEFT_SHOULDER, RIGHT_SHOULDER = 11, 12
LEFT_ELBOW, RIGHT_ELBOW = 13, 14
LEFT_WRIST, RIGHT_WRIST = 15, 16
LEFT_HIP, RIGHT_HIP = 23, 24

MIN_VISIBILITY = 0.5

# ---------------------------------------------------------------------------
# Face regions
# ---------------------------------------------------------------------------
FACE_REGION_NAMES = {
    "eyebrows": "eyebrows",
    "eyes": "eyes",
    "mouth": "mouth",
    "forehead": "forehead",
    "other": "hair and head",
}

# What each facial region looks like for each emotion — the region comes
# from Grad-CAM, the emotion from the model, so the pair is image-specific.
FACE_CUES = {
    "eyebrows": {
        "angry": "pulled down into a frown",
        "sad": "tilted up in a worried way",
        "surprised": "raised up high",
        "happy": "soft and relaxed",
    },
    "eyes": {
        "angry": "narrow and glaring",
        "sad": "droopy and looking down",
        "surprised": "big and wide open",
        "happy": "bright and smiling",
    },
    "mouth": {
        "angry": "pressed tight and grumpy",
        "sad": "turned down at the corners",
        "surprised": "open in a big \"O\"",
        "happy": "curved up in a big smile",
    },
    "forehead": {
        "angry": "all scrunched up",
        "sad": "crinkled and worried",
        "surprised": "lifted up high",
        "happy": "smooth and relaxed",
    },
}
PLURAL_REGIONS = {"eyebrows", "eyes"}

# Fallback region layout, as fractions of the crop (x1, y1, x2, y2), used
# when there are no reliable face landmarks. The crop starts at the top of
# the hair, so the face sits in the lower half.
DEFAULT_FACE_REGIONS = {
    "forehead": (0.25, 0.28, 0.75, 0.38),
    "eyebrows": (0.20, 0.38, 0.80, 0.46),
    "eyes": (0.20, 0.46, 0.80, 0.58),
    "mouth": (0.30, 0.66, 0.70, 0.80),
}

# If the strongest facial region is this much weaker than the image-wide
# peak, the model was mostly looking somewhere else (hair, background).
OFF_FACE_RATIO = 0.45


def face_regions_in_crop(
    landmarks: Optional[Sequence],
    image_size: Tuple[int, int],
    crop_box: Box,
) -> Dict[str, Box]:
    """
    Facial region boxes in crop pixel coordinates. Uses the eye and mouth
    landmarks mapped into the crop when they are visible, otherwise a fixed
    layout scaled to the crop.
    """
    x1, y1, x2, y2 = crop_box
    crop_w, crop_h = max(1, x2 - x1), max(1, y2 - y1)

    points = _face_points(landmarks, image_size, crop_box)
    if points is None:
        return {
            name: (int(fx1 * crop_w), int(fy1 * crop_h), int(fx2 * crop_w), int(fy2 * crop_h))
            for name, (fx1, fy1, fx2, fy2) in DEFAULT_FACE_REGIONS.items()
        }

    left_eye, right_eye, mouth = points
    eye_dist = float(np.hypot(*(left_eye - right_eye)))
    d = max(eye_dist, 0.12 * crop_w)
    eye_y = (left_eye[1] + right_eye[1]) / 2
    eye_x1 = min(left_eye[0], right_eye[0]) - 0.55 * d
    eye_x2 = max(left_eye[0], right_eye[0]) + 0.55 * d

    raw = {
        "forehead": (eye_x1, eye_y - 1.35 * d, eye_x2, eye_y - 0.75 * d),
        "eyebrows": (eye_x1, eye_y - 0.75 * d, eye_x2, eye_y - 0.22 * d),
        "eyes": (eye_x1, eye_y - 0.22 * d, eye_x2, eye_y + 0.35 * d),
        "mouth": (mouth[0] - 0.8 * d, mouth[1] - 0.35 * d, mouth[0] + 0.8 * d, mouth[1] + 0.5 * d),
    }
    return {name: _clip_box(box, crop_w, crop_h) for name, box in raw.items()}


def _face_points(landmarks, image_size, crop_box):
    if landmarks is None:
        return None
    needed = [LEFT_EYE, RIGHT_EYE, MOUTH_LEFT, MOUTH_RIGHT]
    if any(landmarks[i].visibility < MIN_VISIBILITY for i in needed):
        return None

    width, height = image_size
    x1, y1, _, _ = crop_box

    def to_crop(i):
        return np.array([landmarks[i].x * width - x1, landmarks[i].y * height - y1])

    mouth = (to_crop(MOUTH_LEFT) + to_crop(MOUTH_RIGHT)) / 2
    left_eye, right_eye = to_crop(LEFT_EYE), to_crop(RIGHT_EYE)
    # Mouth must be below the eyes, or the landmarks are unusable
    if mouth[1] <= max(left_eye[1], right_eye[1]):
        return None
    return left_eye, right_eye, mouth


def _clip_box(box, w, h) -> Box:
    bx1, by1, bx2, by2 = box
    bx1, bx2 = int(np.clip(bx1, 0, w - 1)), int(np.clip(bx2, 1, w))
    by1, by2 = int(np.clip(by1, 0, h - 1)), int(np.clip(by2, 1, h))
    return bx1, by1, max(bx2, bx1 + 1), max(by2, by1 + 1)


def score_face_regions(cam: np.ndarray, regions: Dict[str, Box]) -> Dict[str, float]:
    """
    Mean Grad-CAM activation inside each region (cam is normalised to 0..1
    and the same size as the crop), plus "other" for everything outside the
    facial regions.
    """
    scores = {}
    outside = np.ones_like(cam, dtype=bool)
    for name, (bx1, by1, bx2, by2) in regions.items():
        patch = cam[by1:by2, bx1:bx2]
        scores[name] = float(patch.mean()) if patch.size else 0.0
        outside[by1:by2, bx1:bx2] = False
    scores["other"] = float(cam[outside].mean()) if outside.any() else 0.0
    return scores


def focus_region(region_scores: Dict[str, float], cam: np.ndarray) -> str:
    """The facial region the model looked at most, or "other" if the heat is mostly off the face."""
    face_scores = {k: v for k, v in region_scores.items() if k != "other"}
    best = max(face_scores, key=face_scores.get)
    peak = float(cam.max()) if cam.size else 0.0
    if peak > 0 and face_scores[best] < OFF_FACE_RATIO * peak and region_scores["other"] > face_scores[best]:
        return "other"
    return best


# ---------------------------------------------------------------------------
# Pose cues and occlusion importance
# ---------------------------------------------------------------------------
BODY_GROUPS = {
    "head": list(range(0, 11)),
    "shoulders": [LEFT_SHOULDER, RIGHT_SHOULDER],
    "arms": list(range(13, 23)),
    "hips": [LEFT_HIP, RIGHT_HIP],
    "legs": list(range(25, 33)),
}

BODY_GROUP_NAMES = {
    "head": "head",
    "shoulders": "shoulders",
    "arms": "arms and hands",
    "hips": "hips",
    "legs": "legs and feet",
}

POSE_CUE_TEXT = {
    "hands_by_face": "hands up by the face",
    "arms_raised": "arms raised up high",
    "arms_crossed": "arms crossed over the chest",
    "arms_in_front": "arms held close in front of the body",
    "head_down": "head tipped down low",
    "arms_hanging": "arms hanging down low",
}

# Which body group each cue belongs to (to pick the cue that matches the
# group occlusion says mattered most).
POSE_CUE_GROUP = {
    "hands_by_face": "arms",
    "arms_raised": "arms",
    "arms_crossed": "arms",
    "arms_in_front": "arms",
    "arms_hanging": "arms",
    "head_down": "head",
}


def detect_pose_cues(landmarks: Optional[Sequence]) -> List[str]:
    """
    Geometric body-language cues, measured relative to shoulder width.
    Thresholds were chosen from the per-class distributions in
    pose_branch/data/pose_keypoints_bg_removed.csv.
    """
    if landmarks is None:
        return []
    core = [NOSE, LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_WRIST, RIGHT_WRIST, LEFT_HIP, RIGHT_HIP]
    if any(landmarks[i].visibility < MIN_VISIBILITY for i in core):
        return []

    nose, ls, rs = landmarks[NOSE], landmarks[LEFT_SHOULDER], landmarks[RIGHT_SHOULDER]
    lw, rw = landmarks[LEFT_WRIST], landmarks[RIGHT_WRIST]
    lh, rh = landmarks[LEFT_HIP], landmarks[RIGHT_HIP]

    shoulder_w = abs(ls.x - rs.x)
    if shoulder_w < 1e-3:
        return []
    shoulder_y = (ls.y + rs.y) / 2
    hip_y = (lh.y + rh.y) / 2
    torso = max(hip_y - shoulder_y, 1e-3)

    head_height = (shoulder_y - nose.y) / shoulder_w
    wrist_height = ((lw.y + rw.y) / 2 - shoulder_y) / torso  # 0 = shoulders, 1 = hips
    wrist_to_nose = (np.hypot(lw.x - nose.x, lw.y - nose.y) + np.hypot(rw.x - nose.x, rw.y - nose.y)) / 2 / shoulder_w
    # Negative when the wrists have swapped sides relative to the shoulders
    wrist_side = (lw.x - rw.x) * np.sign(ls.x - rs.x) / shoulder_w

    cues = []
    if wrist_height < 0.1 and wrist_to_nose < 0.9:
        cues.append("hands_by_face")
    elif wrist_height < -0.1:
        cues.append("arms_raised")
    elif wrist_side < 0 and 0.1 <= wrist_height <= 0.9:
        cues.append("arms_crossed")
    elif abs(wrist_side) < 0.6 and 0.1 <= wrist_height <= 0.9:
        cues.append("arms_in_front")
    elif wrist_height > 0.9:
        cues.append("arms_hanging")

    if head_height < 0.12:
        cues.append("head_down")
    return cues


def landmarks_to_keypoints(landmarks: Sequence) -> np.ndarray:
    return np.array([[lm.x, lm.y, lm.z, lm.visibility] for lm in landmarks], dtype=float).reshape(-1)


def pose_group_importance(
    keypoints: np.ndarray,
    baseline: np.ndarray,
    predict_fn: Callable[[np.ndarray], Dict[str, float]],
    target: str,
) -> Dict[str, float]:
    """
    Occlusion sensitivity for the pose model: for each body group, swap its
    keypoints for the baseline (training-set average) and record how much
    the probability of `target` drops. Bigger drop = that body part mattered
    more. Returned values are normalised to sum to 1 (all zeros if nothing
    mattered).
    """
    original = predict_fn(keypoints)[target]
    drops = {}
    for group, indices in BODY_GROUPS.items():
        occluded = keypoints.copy()
        for i in indices:
            occluded[4 * i:4 * i + 4] = baseline[4 * i:4 * i + 4]
        drops[group] = max(0.0, original - predict_fn(occluded)[target])

    total = sum(drops.values())
    if total <= 0:
        return {g: 0.0 for g in drops}
    return {g: v / total for g, v in drops.items()}


# ---------------------------------------------------------------------------
# Explanation text
# ---------------------------------------------------------------------------
@dataclass
class Explanation:
    reason: str
    face_focus: str
    face_region_scores: Dict[str, float]
    face_cue: Optional[str]
    pose_cues: List[str] = field(default_factory=list)
    pose_focus: Optional[str] = None
    pose_group_scores: Dict[str, float] = field(default_factory=dict)
    evidence: List[str] = field(default_factory=list)


def _sure_word(confidence: float) -> str:
    if confidence >= 0.8:
        return "I'm very sure"
    if confidence >= 0.55:
        return "I'm fairly sure"
    return "I'm not totally sure, but I think"


def _pct(v: float) -> str:
    return f"{round(100 * v)}%"


def build_explanation(
    *,
    emotion: str,
    confidence: float,
    mode: str,
    face_emotion: str,
    face_probs: Dict[str, float],
    pose_emotion: Optional[str],
    pose_probs: Optional[Dict[str, float]],
    region_scores: Dict[str, float],
    face_focus: str,
    pose_cues: Sequence[str],
    pose_group_scores: Dict[str, float],
) -> Explanation:
    upper = emotion.upper()
    face_cue = FACE_CUES.get(face_focus, {}).get(face_emotion)

    # Pose evidence only counts when fusion actually used it
    pose_used = mode == "fused" and pose_emotion is not None
    pose_focus = None
    if pose_used and any(v > 0 for v in pose_group_scores.values()):
        pose_focus = max(pose_group_scores, key=pose_group_scores.get)
    pose_cue = _pick_pose_cue(pose_cues, pose_focus) if pose_used else None

    # --- child-facing sentence -------------------------------------------
    clauses = []
    if face_focus == "other":
        clauses.append("I mostly looked at the hair and head, which is a tricky clue")
    elif face_cue:
        verb = "they were" if face_focus in PLURAL_REGIONS else "it was"
        clauses.append(f"I looked closely at the {FACE_REGION_NAMES[face_focus]}, and {verb} {face_cue}")

    if pose_used:
        if pose_cue:
            body = f"the body had {POSE_CUE_TEXT[pose_cue]}"
        elif pose_focus:
            body = f"the way the {BODY_GROUP_NAMES[pose_focus]} were placed looked {pose_emotion}"
        else:
            body = None
        if body:
            joiner = "and" if pose_emotion == face_emotion else "but"
            clauses.append(f"{joiner} {body}" if clauses else body[0].upper() + body[1:])

    reason = ", ".join(clauses) if clauses else "I looked at the whole character"
    if pose_used and pose_emotion != face_emotion:
        trusted = "body" if emotion == pose_emotion else "face"
        reason += (
            f". The face said {face_emotion.upper()} and the body said {pose_emotion.upper()},"
            f" so I listened to the {trusted} more"
        )
    reason += f". {_sure_word(confidence)} this is {upper}!"

    # --- evidence list for the "why" panel --------------------------------
    evidence = []
    face_label = FACE_REGION_NAMES[face_focus]
    evidence.append(
        f"Face model: {face_emotion} ({_pct(face_probs[face_emotion])}), "
        f"heatmap strongest on the {face_label}"
    )
    if pose_emotion is not None and pose_probs is not None:
        if pose_used:
            detail = f", most important body part: {BODY_GROUP_NAMES[pose_focus]}" if pose_focus else ""
            evidence.append(f"Body model: {pose_emotion} ({_pct(pose_probs[pose_emotion])}){detail}")
        else:
            evidence.append("Body model: skipped (the body was not clear enough)")
    else:
        evidence.append("Body model: skipped (no body found)")
    evidence.append(f"Final answer: {emotion} ({_pct(confidence)})")

    return Explanation(
        reason=reason,
        face_focus=face_focus,
        face_region_scores={k: round(v, 4) for k, v in region_scores.items()},
        face_cue=face_cue,
        pose_cues=list(pose_cues),
        pose_focus=pose_focus,
        pose_group_scores={k: round(v, 4) for k, v in pose_group_scores.items()},
        evidence=evidence,
    )


def _pick_pose_cue(pose_cues: Sequence[str], pose_focus: Optional[str]) -> Optional[str]:
    if not pose_cues:
        return None
    if pose_focus:
        for cue in pose_cues:
            if POSE_CUE_GROUP.get(cue) == pose_focus:
                return cue
    return pose_cues[0]
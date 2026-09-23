"""
Shared image preprocessing for both branches — background removal, flattening
onto a solid color, and MediaPipe pose landmark detection. Runs each step
once per request instead of each branch redoing its own version.
"""
import threading
from dataclasses import dataclass
from typing import List, Optional

import numpy as np
from PIL import Image
import mediapipe as mp
from rembg import new_session, remove

from app.core import config

# Module-level caches — created once, reused across requests
_rembg_session = None
_mp_pose = mp.solutions.pose.Pose(static_image_mode=True, min_detection_confidence=0.5)

# The /predict route runs in a thread pool, but a single mediapipe Pose
# instance isn't safe to call from more than one thread at once.
_mp_pose_lock = threading.Lock()


def load_rembg_session():
    """Call this during the FastAPI startup event."""
    global _rembg_session
    if _rembg_session is None:
        _rembg_session = new_session(config.REMBG_MODEL)
    return _rembg_session


def remove_background(pil_image: Image.Image) -> Image.Image:
    rgba = pil_image.convert("RGBA")
    return remove(rgba, session=load_rembg_session())


def flatten(rgba_image: Image.Image, bg_color) -> Image.Image:
    background = Image.new("RGBA", rgba_image.size, bg_color + (255,))
    background.paste(rgba_image, (0, 0), rgba_image)
    return background.convert("RGB")


def detect_landmarks(rgb_image: Image.Image) -> Optional[List]:
    arr = np.array(rgb_image.convert("RGB"))
    with _mp_pose_lock:
        results = _mp_pose.process(arr)
    if not results.pose_landmarks:
        return None
    return list(results.pose_landmarks.landmark)


@dataclass
class PreparedImage:
    rgba: Image.Image
    flat_rgb: Image.Image
    landmarks: Optional[List]


def prepare_image(pil_image: Image.Image) -> PreparedImage:
    original_rgb = pil_image.convert("RGB")
    rgba = remove_background(pil_image)
    flat_rgb = flatten(rgba, config.FACE_BG_COLOR)

    pose_input = flat_rgb if config.POSE_INPUT_MODE == "bg_removed" else original_rgb
    landmarks = detect_landmarks(pose_input)

    return PreparedImage(
        rgba=rgba,
        flat_rgb=flat_rgb,
        landmarks=landmarks,
    )

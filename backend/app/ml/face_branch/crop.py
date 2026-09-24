"""Face branch inference-time crop."""
from typing import List, Optional, Tuple

import numpy as np
from PIL import Image

from app.core import config


Box = Tuple[int, int, int, int]


def crop_face(rgba_image: Image.Image, landmarks: Optional[List], scale: float = 2.6) -> Image.Image:
    """
    Crops the face region using nose/ear pose landmarks, with fallbacks for
    occluded ears or a missing pose. Always returns the crop flattened onto
    FACE_BG_COLOR as RGB.
    """
    return crop_face_with_box(rgba_image, landmarks, scale)[0]


def crop_face_with_box(
    rgba_image: Image.Image, landmarks: Optional[List], scale: float = 2.6
) -> Tuple[Image.Image, Box]:
    """Same as crop_face(), plus the (x1, y1, x2, y2) crop box in full-image pixels."""
    width, height = rgba_image.size
    alpha = np.array(rgba_image)[:, :, 3] > 128

    if landmarks is None:
        return _crop_from_alpha_mask(rgba_image, alpha, height)

    nose, left_ear, right_ear = landmarks[0], landmarks[7], landmarks[8]
    center_x = nose.x * width
    face_width = abs(left_ear.x - right_ear.x) * width

    ears_visible = left_ear.visibility >= 0.5 and right_ear.visibility >= 0.5
    if not ears_visible or face_width < 0.02 * width:
        left_shoulder, right_shoulder = landmarks[11], landmarks[12]
        shoulder_width = abs(left_shoulder.x - right_shoulder.x) * width
        face_width = shoulder_width * 0.6

    side = face_width * scale

    x1 = int(max(0, center_x - face_width))
    x2 = int(min(width, center_x + face_width))
    rows = np.where(alpha[:, x1:x2].any(axis=1))[0]
    top = rows.min() if len(rows) else nose.y * height - side / 2

    box_y1 = max(0, int(top - side * 0.05))
    box_y2 = min(height, int(box_y1 + side))
    box_x1 = max(0, int(center_x - side / 2))
    box_x2 = min(width, int(center_x + side / 2))

    box = (box_x1, box_y1, box_x2, box_y2)
    return _flatten(rgba_image.crop(box)), box


def _crop_from_alpha_mask(rgba_image: Image.Image, alpha: np.ndarray, height: int) -> Tuple[Image.Image, Box]:
    """No pose detected — fall back to the alpha-mask bounding box, keeping only its top 30%."""
    ys, xs = np.where(alpha)
    if len(ys) == 0:
        return _flatten(rgba_image), (0, 0, rgba_image.width, rgba_image.height)

    x1, y1, x2, y2 = int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())
    head_h = int((y2 - y1) * 0.30)
    box = (x1, y1, x2, min(y1 + head_h, height))
    return _flatten(rgba_image.crop(box)), box


def _flatten(rgba_image: Image.Image) -> Image.Image:
    background = Image.new("RGBA", rgba_image.size, config.FACE_BG_COLOR + (255,))
    background.paste(rgba_image, (0, 0), rgba_image)
    return background.convert("RGB")
"""
/predict endpoint: runs prepare_image() once, then feeds the face crop and
landmarks to the face branch, pose branch, and Grad-CAM before fusing.
"""
import io
import logging
import os
import time
from datetime import datetime
from typing import Optional

import numpy as np
from fastapi import APIRouter, File, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from app.core import config
from app.core.fusion import fuse_predictions
from app.ml import explain
from app.ml.face_branch.crop import crop_face_with_box
from app.ml.face_branch.gradcam import compute_gradcam, render_heatmap_base64
from app.ml.face_branch.inference import predict_face
from app.ml.pipeline import downscale
from app.ml.pose_branch.inference import baseline_keypoints, predict_pose_from_keypoints, predict_pose_from_landmarks
from app.ml.preprocessing import prepare_image
from app.schemas.prediction import BranchResult, ExplanationResult, PredictionResponse, Weights

logger = logging.getLogger(__name__)

router = APIRouter()

DEBUG_DIR = os.path.join(config.APP_DIR, "..", "debug_outputs")

ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg"}
MAX_FILE_BYTES = 10 * 1024 * 1024
MIN_CHARACTER_ALPHA_FRACTION = 0.01
# Share of the foreground that background removal is sure about (alpha > 224).
# A real cut-out is decisive; on a blank or plain image rembg returns a hazy,
# half-transparent mask. Measured: bundled characters 0.94-0.99, plain
# white/grey/skin-tone images 0.02-0.08, a stick figure 0.58.
MIN_DECISIVE_FOREGROUND = 0.75


@router.post("/predict", response_model=PredictionResponse)
def predict_emotion(file: UploadFile = File(...)):
    total_start = time.perf_counter()

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported content type, expected image/png or image/jpeg")

    # Plain def (not async) plus file.file.read() (a blocking call) puts this
    # whole route on FastAPI's thread pool, so the CPU-heavy model calls
    # below don't block the event loop.
    file_bytes = file.file.read()
    if len(file_bytes) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="File too large, maximum size is 10 MB")

    try:
        pil_image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="Could not read image file")

    downscale(pil_image)

    try:
        return run_prediction(pil_image, save_debug=config.DEBUG_SAVE_IMAGES, started=total_start)
    except NoCharacterError:
        raise HTTPException(status_code=422, detail="No character found in the image")


class NoCharacterError(Exception):
    """The image doesn't show a full-body character."""


def looks_like_character(alpha: np.ndarray, landmarks) -> bool:
    """False for images the models would otherwise give a confident but made-up answer.

    Needs enough foreground, a decisive background-removal mask, and body
    landmarks. The app is built for full-body characters: all 72 bundled images
    have landmarks, while plain images and simple shapes have none.
    """
    foreground = alpha > 128
    share = float(foreground.mean())
    if share < MIN_CHARACTER_ALPHA_FRACTION:
        return False
    decisive = float((alpha > 224).mean()) / share
    if decisive < MIN_DECISIVE_FOREGROUND:
        return False
    return landmarks is not None


def run_prediction(pil_image: Image.Image, *, save_debug: bool, started: Optional[float] = None) -> PredictionResponse:
    """The model part of /predict, shared with the startup warm-up.

    Expects an RGB image that has already been downscaled.
    """
    total_start = started if started is not None else time.perf_counter()

    prep_start = time.perf_counter()
    prepared = prepare_image(pil_image)
    prep_time = time.perf_counter() - prep_start

    if not looks_like_character(np.array(prepared.rgba)[:, :, 3], prepared.landmarks):
        raise NoCharacterError()

    face_crop, crop_box = crop_face_with_box(prepared.rgba, prepared.landmarks)

    face_start = time.perf_counter()
    face_probs = predict_face(face_crop)
    face_time = time.perf_counter() - face_start
    face_emotion = max(face_probs, key=face_probs.get)

    pose_start = time.perf_counter()
    pose_probs = predict_pose_from_landmarks(prepared.landmarks)
    pose_time = time.perf_counter() - pose_start

    fused = fuse_predictions(face_probs, pose_probs, prepared.landmarks)

    # Grad-CAM explains the face branch's own top class, not the fused
    # emotion — those can differ once the pose branch is weighed in.
    heatmap_start = time.perf_counter()
    try:
        cam = compute_gradcam(face_crop, config.EMOTION_CLASSES.index(face_emotion))
        heatmap = render_heatmap_base64(face_crop, cam)
    except Exception:
        logger.exception("Grad-CAM heatmap generation failed")
        cam, heatmap = None, None
    heatmap_time = time.perf_counter() - heatmap_start

    pose_emotion = max(pose_probs, key=pose_probs.get) if pose_probs is not None else None

    explain_start = time.perf_counter()
    try:
        explanation = _explain(prepared, crop_box, cam, fused, face_emotion, face_probs, pose_emotion, pose_probs)
    except Exception:
        logger.exception("Explanation generation failed")
        explanation = None
    explain_time = time.perf_counter() - explain_start

    if save_debug:
        _save_debug_images(prepared, face_crop, heatmap)

    logger.info(
        "predict timings (s): prep=%.3f face=%.3f pose=%.3f heatmap=%.3f explain=%.3f total=%.3f",
        prep_time, face_time, pose_time, heatmap_time, explain_time, time.perf_counter() - total_start,
    )

    pose_result = None
    if pose_probs is not None:
        pose_result = BranchResult(
            emotion=pose_emotion,
            probs={k: round(v, 4) for k, v in pose_probs.items()},
        )

    return PredictionResponse(
        emotion=fused.emotion,
        confidence=round(fused.confidence, 4),
        mode=fused.mode,
        fused_probs={k: round(v, 4) for k, v in fused.fused_probs.items()},
        face=BranchResult(
            emotion=face_emotion,
            probs={k: round(v, 4) for k, v in face_probs.items()},
        ),
        pose=pose_result,
        weights=Weights(
            face=round(fused.weights["face"], 4),
            pose=round(fused.weights["pose"], 4),
        ),
        heatmap_base64=heatmap,
        heatmap_emotion=face_emotion,
        explanation=explanation,
    )


def _explain(prepared, crop_box, cam, fused, face_emotion, face_probs, pose_emotion, pose_probs):
    """Grad-CAM region scores + pose occlusion + body cues -> ExplanationResult."""
    if cam is not None:
        regions = explain.face_regions_in_crop(prepared.landmarks, prepared.rgba.size, crop_box)
        region_scores = explain.score_face_regions(cam, regions)
        face_focus = explain.focus_region(region_scores, cam)
    else:
        region_scores, face_focus = {}, "other"

    pose_group_scores = {}
    if fused.mode == "fused" and pose_emotion is not None:
        pose_group_scores = explain.pose_group_importance(
            explain.landmarks_to_keypoints(prepared.landmarks),
            baseline_keypoints(),
            predict_pose_from_keypoints,
            pose_emotion,
        )

    result = explain.build_explanation(
        emotion=fused.emotion,
        confidence=fused.confidence,
        mode=fused.mode,
        face_emotion=face_emotion,
        face_probs=face_probs,
        pose_emotion=pose_emotion,
        pose_probs=pose_probs,
        region_scores=region_scores,
        face_focus=face_focus,
        pose_cues=explain.detect_pose_cues(prepared.landmarks),
        pose_group_scores=pose_group_scores,
    )
    return ExplanationResult(**vars(result))


def _save_debug_images(prepared, face_crop, heatmap_base64):
    import base64

    os.makedirs(DEBUG_DIR, exist_ok=True)
    prefix = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    prepared.rgba.save(os.path.join(DEBUG_DIR, f"{prefix}_rgba.png"))
    face_crop.save(os.path.join(DEBUG_DIR, f"{prefix}_face_crop.png"))

    if heatmap_base64:
        encoded = heatmap_base64.split(",", 1)[1]
        with open(os.path.join(DEBUG_DIR, f"{prefix}_heatmap.png"), "wb") as f:
            f.write(base64.b64decode(encoded))
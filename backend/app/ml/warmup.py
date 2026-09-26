"""Runs one prediction at startup so the first child doesn't wait for the cold one.

The first call through TensorFlow, Grad-CAM, rembg and mediapipe is much slower
than later ones. The image is a copy of a bundled game character (happy_game_01.png).
"""
import logging
import os
import time

from PIL import Image

from app.api.routes.predict import run_prediction
from app.ml.pipeline import downscale

WARMUP_IMAGE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "warmup_character.png")

# The app sets up no logging of its own; uvicorn's logger shows up in the server output
logger = logging.getLogger("uvicorn.error")


def warm_up() -> None:
    """Never raises: a failed warm-up only means the first request is slower."""
    started = time.perf_counter()
    try:
        with Image.open(WARMUP_IMAGE) as image:
            pil_image = image.convert("RGB")
        downscale(pil_image)
        run_prediction(pil_image, save_debug=False)
    except Exception:
        logger.warning("Warm-up prediction failed; the first request will be slower", exc_info=True)
        return
    logger.info("Warm-up prediction took %.1f s", time.perf_counter() - started)

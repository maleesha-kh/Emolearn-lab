"""Preprocessing step shared by the /predict route and eval_fusion.py."""
from PIL import Image

MAX_IMAGE_SIDE = 1024


def downscale(pil_image: Image.Image) -> Image.Image:
    """Resizes in place so the longest side is at most MAX_IMAGE_SIDE, without upscaling."""
    pil_image.thumbnail((MAX_IMAGE_SIDE, MAX_IMAGE_SIDE), Image.LANCZOS)
    return pil_image

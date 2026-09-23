"""
Debug script — runs prepare_image() and crop_face() on one image and saves
the intermediate outputs so the pipeline can be checked visually.

Usage: python scripts/check_crop.py <image_path>
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.ml.preprocessing import prepare_image
from app.ml.face_branch.crop import crop_face

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "debug_outputs")


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/check_crop.py <image_path>")
        sys.exit(1)

    image_path = sys.argv[1]
    os.makedirs(OUT_DIR, exist_ok=True)

    from PIL import Image
    pil_image = Image.open(image_path)

    prepared = prepare_image(pil_image)
    prepared.rgba.save(os.path.join(OUT_DIR, "rgba.png"))
    prepared.flat_rgb.save(os.path.join(OUT_DIR, "flat.png"))

    face_crop = crop_face(prepared.rgba, prepared.landmarks)
    face_crop.save(os.path.join(OUT_DIR, "face_crop.png"))

    print(f"landmarks found: {prepared.landmarks is not None}")
    print(f"face_crop size: {face_crop.size}")


if __name__ == "__main__":
    main()

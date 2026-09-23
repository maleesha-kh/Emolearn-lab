"""
Face branch v4 parity check — the 4 images in eval_data/face_parity/ are
already cropped faces. Runs them through the same resize + preprocess +
model path used in production and checks the output matches the reference
predictions captured from Colab, within tolerance.
"""
import json
import os

import numpy as np
from PIL import Image

from app.ml.face_branch.inference import load_face_model, preprocess_image
from app.core import config

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "eval_data", "face_parity")
REFERENCE_PATH = os.path.join(DATA_DIR, "face_v4_reference_predictions.json")
TOLERANCE = 0.01


def test_face_v4_matches_reference():
    with open(REFERENCE_PATH) as f:
        reference = json.load(f)

    model = load_face_model()

    for filename, expected_probs in reference.items():
        image_path = os.path.join(DATA_DIR, filename)
        face_rgb = Image.open(image_path).convert("RGB")

        batch = preprocess_image(face_rgb)
        actual_probs = model.predict(batch, verbose=0)[0]

        print(f"\n{filename}")
        print(f"  classes:  {config.EMOTION_CLASSES}")
        print(f"  expected: {expected_probs}")
        print(f"  actual:   {actual_probs.tolist()}")

        np.testing.assert_allclose(actual_probs, expected_probs, atol=TOLERANCE)

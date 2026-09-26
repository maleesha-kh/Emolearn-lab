"""The /predict no-character check.

The slow tests run every bundled character and a set of synthetic
non-character images through the real models (about 2 minutes):
    python -m pytest tests -m slow          (only the slow tests)
    EMOLEARN_SLOW_TESTS=1 python -m pytest tests   (everything)
"""
from pathlib import Path

import numpy as np
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

from app.api.routes import predict

BUNDLED_DIR = Path(__file__).resolve().parents[2] / "frontend" / "public" / "images" / "characters"
W, H = 512, 768


def mask(foreground_share: float, decisive: float, size: int = 10_000) -> np.ndarray:
    """An alpha mask with the given foreground share, of which `decisive` is near-opaque."""
    alpha = np.zeros(size, dtype=np.uint8)
    foreground = int(size * foreground_share)
    sure = int(foreground * decisive)
    alpha[:sure] = 255
    alpha[sure:foreground] = 180
    return alpha.reshape(100, -1)


LANDMARKS = [object()] * 33


def test_accepts_a_decisive_mask_with_landmarks():
    assert predict.looks_like_character(mask(0.3, 0.95), LANDMARKS)


def test_rejects_too_little_foreground():
    assert not predict.looks_like_character(mask(0.005, 1.0), LANDMARKS)


def test_rejects_a_hazy_mask_even_with_landmarks():
    # What rembg returns for a plain white or grey image
    assert not predict.looks_like_character(mask(0.5, 0.02), LANDMARKS)
    assert predict.looks_like_character(mask(0.5, 0.76), LANDMARKS)
    assert not predict.looks_like_character(mask(0.5, 0.74), LANDMARKS)


def test_rejects_a_clean_shape_without_landmarks():
    assert not predict.looks_like_character(mask(0.2, 0.98), None)


def test_route_answers_422_no_character(monkeypatch):
    def no_character(*args, **kwargs):
        raise predict.NoCharacterError()

    monkeypatch.setattr(predict, "run_prediction", no_character)
    app = FastAPI()
    app.include_router(predict.router)
    with TestClient(app) as client:
        response = client.post("/predict", files={"file": ("blank.png", _png_bytes(Image.new("RGB", (64, 64), "white")), "image/png")})
    assert response.status_code == 422
    assert response.json() == {"detail": "No character found in the image"}


def _png_bytes(image: Image.Image) -> bytes:
    import io

    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def _synthetic_images():
    rng = np.random.default_rng(1234)
    images = {}
    for name, colour in {"white": (255, 255, 255), "grey": (128, 128, 128), "black": (0, 0, 0), "red": (220, 30, 30),
                         "green": (40, 180, 60), "blue": (30, 60, 220), "yellow": (250, 220, 40), "skin_tone": (224, 172, 140)}.items():
        images[f"solid_{name}"] = Image.new("RGB", (W, H), colour)
    ramp = np.linspace(0, 255, W, dtype=np.uint8)
    images["gradient_horizontal"] = Image.fromarray(np.dstack([np.tile(ramp, (H, 1))] * 3))
    vramp = np.linspace(0, 255, H, dtype=np.uint8)[:, None]
    images["gradient_colour_vertical"] = Image.fromarray(np.dstack(
        [np.tile(vramp, (1, W)), np.tile(255 - vramp, (1, W)), np.full((H, W), 128, np.uint8)]))
    images["noise_random"] = Image.fromarray(rng.integers(0, 256, (H, W, 3), dtype=np.uint8))
    blocks = np.kron(rng.integers(0, 256, (H // 32, W // 32), dtype=np.uint8), np.ones((32, 32), np.uint8))
    images["noise_grey_blocks"] = Image.fromarray(np.dstack([blocks] * 3))

    img = Image.new("RGB", (W, H), "white")
    ImageDraw.Draw(img).ellipse((156, 284, 356, 484), fill=(20, 20, 20))
    images["shape_black_circle_on_white"] = img
    img = Image.new("RGB", (W, H), (230, 230, 230))
    ImageDraw.Draw(img).rectangle((150, 200, 360, 600), fill=(220, 40, 40))
    images["shape_red_rectangle_on_grey"] = img
    img = Image.new("RGB", (W, H), "white")
    draw = ImageDraw.Draw(img)
    draw.ellipse((216, 120, 296, 200), outline="black", width=6)
    for line in [(256, 200, 256, 450), (256, 260, 170, 340), (256, 260, 342, 340), (256, 450, 190, 620), (256, 450, 322, 620)]:
        draw.line(line, fill="black", width=6)
    images["shape_stick_figure_on_white"] = img
    img = Image.new("RGB", (W, H), (30, 30, 60))
    ImageDraw.Draw(img).polygon([(256, 150), (420, 600), (92, 600)], fill=(250, 200, 0))
    images["shape_yellow_triangle_on_dark"] = img
    return images


SYNTHETIC = _synthetic_images()
BUNDLED = sorted(BUNDLED_DIR.rglob("*.png"))


@pytest.fixture(scope="module")
def models():
    from app.ml.face_branch.inference import load_face_model
    from app.ml.pose_branch.inference import load_pose_model
    from app.ml.preprocessing import load_rembg_session

    load_pose_model()
    load_face_model()
    load_rembg_session()


def _prepared(image: Image.Image) -> Image.Image:
    from app.ml.pipeline import downscale

    image = image.convert("RGB")
    downscale(image)
    return image


@pytest.mark.slow
def test_all_72_bundled_images_are_present():
    assert len(BUNDLED) == 72


@pytest.mark.slow
@pytest.mark.parametrize("path", BUNDLED, ids=lambda p: p.name)
def test_bundled_character_is_accepted(models, path):
    with Image.open(path) as image:
        result = predict.run_prediction(_prepared(image), save_debug=False)
    assert result.emotion in {"happy", "sad", "angry", "surprised"}


@pytest.mark.slow
@pytest.mark.parametrize("name", sorted(SYNTHETIC))
def test_synthetic_image_is_rejected(models, name):
    with pytest.raises(predict.NoCharacterError):
        predict.run_prediction(_prepared(SYNTHETIC[name]), save_debug=False)

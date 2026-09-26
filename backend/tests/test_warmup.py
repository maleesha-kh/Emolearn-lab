import logging

from PIL import Image

from app.ml import warmup


def test_warmup_image_is_a_readable_png():
    with Image.open(warmup.WARMUP_IMAGE) as image:
        assert image.format == "PNG"
        image.verify()


def test_warmup_runs_the_shared_pipeline_without_saving(monkeypatch, caplog):
    calls = []
    monkeypatch.setattr(warmup, "run_prediction", lambda image, **kwargs: calls.append((image.mode, kwargs)))

    with caplog.at_level(logging.INFO, logger="uvicorn.error"):
        warmup.warm_up()

    assert calls == [("RGB", {"save_debug": False})]
    assert "Warm-up prediction took" in caplog.text


def test_warmup_failure_is_logged_and_never_raises(monkeypatch, caplog):
    def broken(image, **kwargs):
        raise RuntimeError("model file missing")

    monkeypatch.setattr(warmup, "run_prediction", broken)

    with caplog.at_level(logging.WARNING, logger="uvicorn.error"):
        warmup.warm_up()

    assert "Warm-up prediction failed" in caplog.text
    assert "model file missing" in caplog.text

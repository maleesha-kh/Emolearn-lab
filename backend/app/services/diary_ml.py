"""Reason and sentiment prediction for diary notes, using the pipelines trained
in ml/diary. The models load lazily on first use. If they are missing or
broken the app falls back to reason "other" and no sentiment instead of
failing.
"""
import logging
import threading
from pathlib import Path
from typing import Optional, Tuple

import joblib

from app.services.diary_config import REASON_THRESHOLD, SENTIMENT_THRESHOLD

logger = logging.getLogger(__name__)

MODELS_DIR = Path(__file__).resolve().parents[2] / "ml" / "diary" / "models"

FALLBACK = {"reason": "other", "reason_confidence": None, "sentiment": None, "sentiment_confidence": None}

_models = None  # (reason_model, sentiment_model), or False after a failed load
_lock = threading.Lock()


def _load_models(models_dir: Path) -> Optional[Tuple[object, object]]:
    try:
        return joblib.load(models_dir / "reason.joblib"), joblib.load(models_dir / "sentiment.joblib")
    except Exception:
        logger.warning("Diary models could not be loaded from %s; using fallbacks", models_dir, exc_info=True)
        return None


def _get_models() -> Optional[Tuple[object, object]]:
    global _models
    if _models is None:
        with _lock:
            if _models is None:
                _models = _load_models(MODELS_DIR) or False
    return _models or None


def _top(model, text: str) -> Tuple[str, float]:
    proba = model.predict_proba([text])[0]
    best = proba.argmax()
    return str(model.classes_[best]), round(float(proba[best]), 4)


def classify(text: str) -> dict:
    models = _get_models()
    if models is None:
        return dict(FALLBACK)
    reason_model, sentiment_model = models
    try:
        reason, reason_confidence = _top(reason_model, text)
        sentiment, sentiment_confidence = _top(sentiment_model, text)
    except Exception:
        logger.exception("Diary model prediction failed; using fallbacks")
        return dict(FALLBACK)
    return {
        # Below a threshold the label is not trusted, but the confidence is kept for analysis
        "reason": reason if reason_confidence >= REASON_THRESHOLD else "other",
        "reason_confidence": reason_confidence,
        "sentiment": sentiment if sentiment_confidence >= SENTIMENT_THRESHOLD else None,
        "sentiment_confidence": sentiment_confidence,
    }

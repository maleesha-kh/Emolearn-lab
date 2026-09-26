import logging

import numpy as np
import pytest

from app.data.tip_bank import CONCERN_RESPONSE, DEFAULTS, TIP_BANK, WATCH_NOTE
from app.db.models import ParentTip
from app.services import diary_ml
from app.services.safety import CONCERN_REPLY

REAL_GET_MODELS = diary_ml._get_models
REASONS = ["family", "friends", "other", "pets", "playing", "school"]
SENTIMENTS = ["negative", "positive"]
PIN = "1234"
PARENT = {"X-Parent-Pin": PIN}


class FakeModel:
    def __init__(self, classes, label, confidence):
        self.classes_ = np.array(classes)
        rest = (1 - confidence) / (len(classes) - 1)
        self.proba = np.array([confidence if c == label else rest for c in classes])
        self.calls = 0

    def predict_proba(self, texts):
        self.calls += len(texts)
        return np.array([self.proba for _ in texts])


def use_models(monkeypatch, reason=("pets", 0.9), sentiment=("negative", 0.9)):
    models = FakeModel(REASONS, *reason), FakeModel(SENTIMENTS, *sentiment)
    monkeypatch.setattr(diary_ml, "_get_models", lambda: models)
    return models


@pytest.fixture()
def player_id(client):
    assert client.post("/parent/pin/setup", json={"pin": PIN}).status_code == 201
    return client.post("/players", json={"nickname": "Amara", "avatar_id": "fox"}).json()["id"]


def post(client, player_id, **fields):
    body = {"emotion": "sad", "intensity": "little", "reason_tags": []}
    body.update(fields)
    res = client.post(f"/players/{player_id}/diary", json=body)
    assert res.status_code == 201, res.text
    return res.json()


def tips(client, player_id, entry_id):
    res = client.post(f"/players/{player_id}/diary/{entry_id}/tips", headers=PARENT)
    assert res.status_code == 200, res.text
    return res.json()


# --- classify ----------------------------------------------------------------

def test_classify_above_thresholds(monkeypatch):
    use_models(monkeypatch, reason=("school", 0.8), sentiment=("positive", 0.7))
    assert diary_ml.classify("i got a star") == {
        "reason": "school", "reason_confidence": 0.8, "sentiment": "positive", "sentiment_confidence": 0.7,
    }


def test_low_confidence_gives_other_and_no_sentiment(monkeypatch):
    use_models(monkeypatch, reason=("school", 0.4), sentiment=("positive", 0.55))
    assert diary_ml.classify("hmm") == {
        "reason": "other", "reason_confidence": 0.4, "sentiment": None, "sentiment_confidence": 0.55,
    }


def test_missing_model_files_do_not_crash(monkeypatch, tmp_path, caplog, client, player_id):
    monkeypatch.setattr(diary_ml, "_get_models", REAL_GET_MODELS)
    monkeypatch.setattr(diary_ml, "_models", None)
    monkeypatch.setattr(diary_ml, "MODELS_DIR", tmp_path)

    with caplog.at_level(logging.WARNING, logger="app.services.diary_ml"):
        assert diary_ml.classify("my dog is sick") == diary_ml.FALLBACK
        assert diary_ml.classify("my cat is sick") == diary_ml.FALLBACK
    assert len([r for r in caplog.records if r.levelno == logging.WARNING]) == 1

    body = post(client, player_id, note="my dog is sick")
    assert body["reason_used"] == "other"
    assert body["reason_source"] == "default"
    assert body["reason_confidence"] is None
    assert body["sentiment"] is None
    assert body["bot_reply"] in TIP_BANK[("sad", "other")]["child_replies"]


def test_prediction_error_does_not_crash(monkeypatch):
    class Broken:
        classes_ = np.array(["a"])

        def predict_proba(self, texts):
            raise ValueError("broken")

    monkeypatch.setattr(diary_ml, "_get_models", lambda: (Broken(), Broken()))
    assert diary_ml.classify("anything") == diary_ml.FALLBACK


# --- reason and sentiment on POST --------------------------------------------

def test_chip_overrides_model(monkeypatch, client, player_id):
    use_models(monkeypatch, reason=("pets", 0.9), sentiment=("negative", 0.8))
    body = post(client, player_id, reason_tags=["school", "pets"], note="i lost my pencil")
    assert body["reason_used"] == "school"
    assert body["reason_source"] == "chip"
    assert body["reason_confidence"] is None
    assert body["sentiment"] == "negative"
    assert body["sentiment_confidence"] == 0.8
    assert body["bot_reply"] in TIP_BANK[("sad", "school")]["child_replies"]


def test_other_chip_with_note_uses_model(monkeypatch, client, player_id):
    use_models(monkeypatch, reason=("pets", 0.9))
    body = post(client, player_id, reason_tags=["other", "school"], note="my dog is sick")
    assert body["reason_used"] == "pets"
    assert body["reason_source"] == "model"
    assert body["reason_confidence"] == 0.9
    assert body["bot_reply"] in TIP_BANK[("sad", "pets")]["child_replies"]


def test_low_confidence_on_post(monkeypatch, client, player_id):
    use_models(monkeypatch, reason=("pets", 0.3), sentiment=("positive", 0.55))
    body = post(client, player_id, emotion="happy", note="something happened")
    assert body["reason_used"] == "other"
    assert body["reason_source"] == "model"
    assert body["reason_confidence"] == 0.3
    assert body["sentiment"] is None
    assert body["sentiment_confidence"] == 0.55


def test_other_chip_without_note_is_default(client, player_id):
    body = post(client, player_id, reason_tags=["other"])
    assert body["reason_used"] == "other"
    assert body["reason_source"] == "default"
    assert body["reason_confidence"] is None


@pytest.mark.parametrize("emotion, sentiment", [
    ("happy", "positive"), ("sad", "negative"), ("angry", "negative"), ("surprised", None),
])
def test_sentiment_from_emotion_without_note(monkeypatch, client, player_id, emotion, sentiment):
    models = use_models(monkeypatch)
    body = post(client, player_id, emotion=emotion, reason_tags=["friends"])
    assert body["sentiment"] == sentiment
    assert body["sentiment_confidence"] is None
    assert models[0].calls == models[1].calls == 0


def test_sentiment_model_runs_for_every_emotion_with_a_note(monkeypatch, client, player_id):
    use_models(monkeypatch, sentiment=("negative", 0.75))
    body = post(client, player_id, emotion="happy", reason_tags=["family"], note="we went out")
    assert body["sentiment"] == "negative"
    assert body["sentiment_confidence"] == 0.75
    assert body["bot_reply"] in TIP_BANK[("happy", "family")]["child_replies"]


@pytest.mark.parametrize("sentiment, expected", [
    (("positive", 0.9), TIP_BANK[("surprised", "family", "positive")]),
    (("negative", 0.9), TIP_BANK[("surprised", "family", "negative")]),
    (("positive", 0.55), DEFAULTS["surprised_unsure"]),
])
def test_surprised_uses_sentiment_for_the_entry(monkeypatch, client, player_id, sentiment, expected):
    use_models(monkeypatch, sentiment=sentiment)
    body = post(client, player_id, emotion="surprised", reason_tags=["family"], note="my uncle came")
    assert body["bot_reply"] in expected["child_replies"]
    assert tips(client, player_id, body["id"])["tips"] == expected["tips"]


def test_surprised_without_note_is_unsure(client, player_id):
    body = post(client, player_id, emotion="surprised", reason_tags=["school"])
    assert body["sentiment"] is None
    assert body["bot_reply"] in DEFAULTS["surprised_unsure"]["child_replies"]


# --- safety ------------------------------------------------------------------

def test_high_concern_skips_model_and_bank(monkeypatch, client, player_id):
    models = use_models(monkeypatch)
    body = post(client, player_id, reason_tags=["family"], note="my uncle hit me")
    assert body["concern_flag"] is True
    assert body["bot_reply"] == CONCERN_REPLY
    for field in ["reason_used", "reason_source", "reason_confidence", "sentiment", "sentiment_confidence"]:
        assert body[field] is None
    assert models[0].calls == models[1].calls == 0

    result = tips(client, player_id, body["id"])
    assert result["source"] == "concern"
    assert result["concern_level"] == "high"
    assert result["summary"] == CONCERN_RESPONSE["parent_summary"]
    assert result["tips"] == CONCERN_RESPONSE["tips"]
    assert result["talk_starter"] == CONCERN_RESPONSE["talk_starter"]


def test_watch_entry_gets_normal_reply_and_watch_note(monkeypatch, client, player_id):
    use_models(monkeypatch, reason=("pets", 0.9))
    body = post(client, player_id, note="my dog ran away")
    assert body["concern_level"] == "watch"
    assert body["concern_flag"] is False
    assert body["bot_reply"] in TIP_BANK[("sad", "pets")]["child_replies"]

    result = tips(client, player_id, body["id"])
    assert result["source"] == "tip_bank"
    assert result["concern_level"] == "watch"
    assert result["summary"].endswith(WATCH_NOTE)
    assert result["tips"] == TIP_BANK[("sad", "pets")]["tips"]


# --- parent tips -------------------------------------------------------------

def test_intensity_lot_adds_note(client, player_id):
    little = post(client, player_id, reason_tags=["school"], intensity="little")
    lot = post(client, player_id, reason_tags=["school"], intensity="lot")
    summary = TIP_BANK[("sad", "school")]["parent_summary"]
    assert tips(client, player_id, little["id"])["summary"] == summary
    assert tips(client, player_id, lot["id"])["summary"] == summary + " Your child said this feeling was big."


def test_tips_are_saved_once(db_client):
    client, session_local = db_client
    client.post("/parent/pin/setup", json={"pin": PIN})
    player_id = client.post("/players", json={"nickname": "Amara", "avatar_id": "fox"}).json()["id"]
    entry_id = post(client, player_id, reason_tags=["friends"])["id"]

    first = tips(client, player_id, entry_id)
    second = tips(client, player_id, entry_id)
    assert first == second
    assert first["source"] == "tip_bank"
    with session_local() as db:
        assert db.query(ParentTip).filter_by(diary_entry_id=entry_id).count() == 1


def test_tips_need_pin_and_matching_entry(client, player_id):
    entry_id = post(client, player_id, reason_tags=["friends"])["id"]
    assert client.post(f"/players/{player_id}/diary/{entry_id}/tips").status_code == 401
    assert client.post(f"/players/{player_id}/diary/{entry_id}/tips", headers={"X-Parent-Pin": "0000"}).status_code == 403
    assert client.post(f"/players/{player_id}/diary/99999/tips", headers=PARENT).status_code == 404

    other_id = client.post("/players", json={"nickname": "Nimal", "avatar_id": "owl"}).json()["id"]
    assert client.post(f"/players/{other_id}/diary/{entry_id}/tips", headers=PARENT).status_code == 404


# --- real models (integration) -------------------------------------------------

def test_real_models_predict_pets():
    if not all((diary_ml.MODELS_DIR / f).exists() for f in ["reason.joblib", "sentiment.joblib"]):
        pytest.skip("diary model files are not present")
    models = diary_ml._load_models(diary_ml.MODELS_DIR)
    assert models is not None
    reason, confidence = diary_ml._top(models[0], "my dog is sick")
    assert reason == "pets"
    assert 0 <= confidence <= 1

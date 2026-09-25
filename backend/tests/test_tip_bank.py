import random
import re

import pytest

from app.data.tip_bank import (
    CONCERN_RESPONSE,
    DEFAULTS,
    TIP_BANK,
    WATCH_NOTE,
    get_entry,
    intensity_note,
    pick_child_reply,
)
from app.services import safety

REASONS = ["school", "friends", "family", "playing", "pets", "other"]
EXPECTED_KEYS = (
    [(emotion, reason) for emotion in ["happy", "sad", "angry"] for reason in REASONS]
    + [("surprised", reason, sentiment) for reason in REASONS for sentiment in ["positive", "negative"]]
)
EXPECTED_DEFAULTS = ["happy", "sad", "angry", "surprised_positive", "surprised_negative", "surprised_unsure"]
ALL_ENTRIES = [(str(k), e) for k, e in TIP_BANK.items()] + [(k, e) for k, e in DEFAULTS.items()]

EMOJI = re.compile("[\U0001F000-\U0001FFFF☀-➿]")


def words(text):
    return re.findall(r"[A-Za-z0-9']+", text)


def test_all_keys_and_defaults_exist():
    assert len(EXPECTED_KEYS) == 30
    assert set(TIP_BANK) == set(EXPECTED_KEYS)
    assert set(DEFAULTS) == set(EXPECTED_DEFAULTS)


@pytest.mark.parametrize("name, entry", ALL_ENTRIES)
def test_entry_shape(name, entry):
    assert len(entry["child_replies"]) == 3
    assert len(set(entry["child_replies"])) == 3
    assert len(entry["tips"]) == 3
    assert entry["parent_summary"].strip()
    assert entry["talk_starter"].strip()
    for text in entry["child_replies"] + entry["tips"]:
        assert text.strip(), name


@pytest.mark.parametrize("name, entry", ALL_ENTRIES)
def test_child_replies_are_short_with_at_most_one_emoji(name, entry):
    for reply in entry["child_replies"]:
        assert len(words(reply)) <= 15, reply
        assert len(EMOJI.findall(reply)) <= 1, reply


def test_no_tip_repeats_across_entries():
    tips = [tip for _, entry in ALL_ENTRIES for tip in entry["tips"]] + CONCERN_RESPONSE["tips"]
    repeated = {tip for tip in tips if tips.count(tip) > 1}
    assert not repeated


def test_no_banned_phrases():
    banned = ["don't be sad", "dont be sad", "stop being angry", "calm down!"]
    texts = [t for _, e in ALL_ENTRIES for t in e["child_replies"] + e["tips"] + [e["parent_summary"]]]
    for text in texts:
        assert not any(b in text.lower() for b in banned), text


def test_get_entry_exact_keys():
    assert get_entry("sad", "pets") is TIP_BANK[("sad", "pets")]
    assert get_entry("surprised", "family", "positive") is TIP_BANK[("surprised", "family", "positive")]
    assert get_entry("surprised", "school", "negative") is TIP_BANK[("surprised", "school", "negative")]
    assert get_entry("happy", "school", "negative") is TIP_BANK[("happy", "school")]


def test_get_entry_fallbacks():
    assert get_entry("happy", None) is DEFAULTS["happy"]
    assert get_entry("angry", "unknown") is DEFAULTS["angry"]
    assert get_entry("surprised", "school", None) is DEFAULTS["surprised_unsure"]
    assert get_entry("surprised", None, None) is DEFAULTS["surprised_unsure"]
    assert get_entry("surprised", None, "positive") is DEFAULTS["surprised_positive"]
    assert get_entry("surprised", "unknown", "negative") is DEFAULTS["surprised_negative"]


def test_pick_child_reply_is_repeatable_with_rng():
    entry = TIP_BANK[("happy", "friends")]
    first = [pick_child_reply(entry, random.Random(3)) for _ in range(5)]
    assert len(set(first)) == 1
    assert first[0] in entry["child_replies"]
    assert pick_child_reply(entry) in entry["child_replies"]


def test_intensity_note():
    assert intensity_note("little") == ""
    assert intensity_note("lot") == "Your child said this feeling was big."


def test_concern_response_uses_safety_reply():
    assert CONCERN_RESPONSE["child"] == safety.CONCERN_REPLY
    assert CONCERN_RESPONSE["parent_summary"] == "Your child wrote something that may need your attention."
    assert CONCERN_RESPONSE["talk_starter"] == "Can you tell me more about what happened? You're not in trouble."
    assert len(CONCERN_RESPONSE["tips"]) == 3
    assert any("1929" in tip for tip in CONCERN_RESPONSE["tips"])


def test_watch_note():
    assert WATCH_NOTE == "Your child used some words that may be worth gently asking about."

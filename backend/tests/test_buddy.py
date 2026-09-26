import random
import re
from datetime import datetime, timezone

import pytest

from app.api.routes import buddy as buddy_routes
from app.core.local_time import local_day_bounds_utc
from app.data.buddy_faq import FAQ, FAQ_BY_ID, SUGGESTED_IDS
from app.db.models import BuddyMessage
from app.services import buddy
from app.services.buddy_text import FEELING_WORDS, SYNONYMS, passes_topic_gate, prepare
from app.services.safety import CONCERN_REPLY, check_concern

PIN = "1234"
PARENT = {"X-Parent-Pin": PIN}
# 11:30 in Sri Lanka, well away from midnight
NOON_UTC = datetime(2026, 3, 10, 6, 0, tzinfo=timezone.utc)
EMOJI = re.compile("[\U0001F000-\U0001FFFF☀-➿]")


@pytest.fixture(autouse=True)
def fixed_clock(monkeypatch):
    clock = {"now": NOON_UTC}
    monkeypatch.setattr(buddy_routes, "utc_now", lambda: clock["now"])
    return clock


def create_player(client, nickname="Amara", avatar_id="fox"):
    return client.post("/players", json={"nickname": nickname, "avatar_id": avatar_id}).json()["id"]


@pytest.fixture()
def player_id(client):
    assert client.post("/parent/pin/setup", json={"pin": PIN}).status_code == 201
    return create_player(client)


def ask(client, player_id, question):
    res = client.post(f"/players/{player_id}/buddy/ask", json={"question": question})
    assert res.status_code == 200, res.text
    return res.json()


def messages(client, player_id):
    res = client.get(f"/players/{player_id}/buddy/messages", headers=PARENT)
    assert res.status_code == 200
    return res.json()


# --- matching ----------------------------------------------------------------

def test_exact_question_matches(client, player_id):
    body = ask(client, player_id, "What does happy mean?")
    assert body["answer"] == FAQ_BY_ID["what-is-happy"]["answer"]
    assert body["suggestions"] == []
    assert set(body) == {"answer", "suggestions", "related", "remaining_today", "resting"}


@pytest.mark.parametrize("question, faq_id", [
    ("what does it mean to feel proud", "feeling-proud"),
    ("why do people cry", "why-do-we-cry"),
    ("how can i calm myself down", "calm-down"),
])
def test_reworded_question_matches(client, player_id, question, faq_id):
    assert ask(client, player_id, question)["answer"] == FAQ_BY_ID[faq_id]["answer"]


def test_off_topic_gets_no_match_and_suggestions(client, player_id):
    body = ask(client, player_id, "what is the capital of france")
    assert body["answer"] == buddy.NO_MATCH_REPLY
    assert body["related"] == []
    assert len(body["suggestions"]) == 3
    for s in body["suggestions"]:
        assert s["id"] in SUGGESTED_IDS
        assert s["question"] == FAQ_BY_ID[s["id"]]["question"]
    assert len({s["id"] for s in body["suggestions"]}) == 3


def test_match_returns_two_related_items(client, player_id):
    body = ask(client, player_id, "Why do we cry?")
    assert body["answer"] == FAQ_BY_ID["why-do-we-cry"]["answer"]
    assert len(body["related"]) == 2
    ids = [r["id"] for r in body["related"]]
    assert "why-do-we-cry" not in ids and len(set(ids)) == 2
    for r in body["related"]:
        assert r["question"] == FAQ_BY_ID[r["id"]]["question"]
        assert set(r) == {"id", "question"}


def test_related_are_the_next_best_items_above_min_score():
    question = "Why do we cry?"
    ranked = [(item["id"], score) for item, score in buddy._get_matcher().item_scores(question)]
    expected = [i for i, score in ranked if i != "why-do-we-cry" and score > buddy.RELATED_MIN_SCORE][:2]
    assert [r["id"] for r in buddy.related(question, "why-do-we-cry")] == expected


def test_related_respects_min_score(monkeypatch):
    monkeypatch.setattr(buddy, "RELATED_MIN_SCORE", 0.999)
    assert buddy.related("Why do we cry?", "why-do-we-cry") == []


def test_related_is_empty_for_gated_questions():
    assert buddy.related("what is 5 plus 5", "what-is-sad") == []


def test_related_does_not_change_the_chosen_answer():
    matcher = buddy._get_matcher()
    for item in FAQ:
        for text in [item["question"], *item["phrasings"]]:
            if passes_topic_gate(text):
                assert matcher.item_scores(text)[0][0]["id"] == matcher.best(text)[0]["id"], text


def test_no_match_reply_text():
    assert buddy.NO_MATCH_REPLY == (
        "Hmm, I'm not sure what to say to that. You can tell your grown-up about it, or try one of these 👇"
    )


@pytest.mark.parametrize("question", ["what is 5 plus 5", "tell me a story", "whats your favourite colour"])
def test_topic_gate_rejects_questions_without_feelings_words(question):
    assert not passes_topic_gate(question)
    assert buddy.best_match(question) == (None, 0.0)
    assert buddy.match(question) == (None, 0.0)


def test_topic_gate_lets_feelings_questions_through():
    assert passes_topic_gate("why do i feel so sad")
    # A synonym counts too: "frightened" becomes "scared"
    assert passes_topic_gate("i am frightened")


def test_every_faq_question_passes_the_gate():
    for item in FAQ:
        assert passes_topic_gate(item["question"]), item["question"]


def test_synonyms_and_stop_words():
    assert prepare("I was so frightened and MAD!!") == "scared angry"
    assert prepare("wat is angree") == "angry"
    assert prepare("i feel left out") == "feel lonely"
    assert prepare("no one plays with me") == "nobody plays"
    assert "cry" not in prepare("") and prepare("") == ""


def test_synonym_groups_are_consistent():
    variants = [v for vs in SYNONYMS.values() for v in vs]
    assert len(variants) == len(set(variants))
    assert not set(variants) & set(SYNONYMS)
    # Gate words are written in their canonical form
    assert not FEELING_WORDS & set(variants)


@pytest.mark.parametrize("question, faq_id", [
    ("i am so frightened what do i do", "feeling-scared"),
    ("wat is angree", "what-is-angry"),
])
def test_synonyms_help_matching(client, player_id, question, faq_id):
    assert ask(client, player_id, question)["answer"] == FAQ_BY_ID[faq_id]["answer"]


def test_suggestions_are_repeatable_with_rng():
    first = [s["id"] for s in buddy.suggestions(3, random.Random(5))]
    assert first == [s["id"] for s in buddy.suggestions(3, random.Random(5))]
    assert len(set(first)) == 3


def test_match_respects_threshold():
    item, score = buddy.match("What does sad mean?")
    assert item["id"] == "what-is-sad" and score == pytest.approx(1.0)
    assert buddy.match("What does sad mean?", threshold=1.01)[0] is None


# --- safety --------------------------------------------------------------------

def test_high_question_gets_concern_reply_even_over_limit(client, player_id):
    for _ in range(buddy.DAILY_LIMIT):
        ask(client, player_id, "why do we cry")
    assert ask(client, player_id, "why do we cry")["answer"] == buddy.RESTING_REPLY

    body = ask(client, player_id, "i want to die")
    assert body["answer"] == CONCERN_REPLY
    assert body["suggestions"] == []
    assert body["related"] == []
    assert set(body) == {"answer", "suggestions", "related", "remaining_today", "resting"}

    saved = messages(client, player_id)[0]
    assert saved["question"] == "i want to die"
    assert saved["concern_level"] == "high"
    assert saved["concern_categories"] == ["self_harm"]


def test_high_questions_do_not_use_up_the_limit(client, player_id):
    before = ask(client, player_id, "why do we cry")["remaining_today"]
    assert ask(client, player_id, "my uncle hit me")["remaining_today"] == before
    assert ask(client, player_id, "why do we cry")["remaining_today"] == before - 1


def test_watch_question_gets_normal_answer_and_is_saved_as_watch(client, player_id):
    body = ask(client, player_id, "my dog ran away")
    # No feelings word, so it gets the normal no-match reply rather than the safety reply
    assert body["answer"] == buddy.NO_MATCH_REPLY
    saved = messages(client, player_id)[0]
    assert saved["concern_level"] == "watch"
    assert saved["concern_categories"] == ["danger"]


# --- daily limit ---------------------------------------------------------------

def test_remaining_counts_down_and_eleventh_is_resting(db_client):
    client, session_local = db_client
    player_id = create_player(client)
    remaining = [ask(client, player_id, "what does happy mean")["remaining_today"] for _ in range(buddy.DAILY_LIMIT)]
    assert remaining == list(range(buddy.DAILY_LIMIT - 1, -1, -1))

    body = ask(client, player_id, "what does happy mean")
    assert body == {
        "answer": buddy.RESTING_REPLY, "suggestions": [], "related": [], "remaining_today": 0, "resting": True,
    }
    with session_local() as db:
        assert db.query(BuddyMessage).filter_by(player_id=player_id).count() == buddy.DAILY_LIMIT


def test_resting_flag_is_true_only_for_the_over_limit_reply(client, player_id):
    flags = [ask(client, player_id, "why do we cry")["resting"] for _ in range(buddy.DAILY_LIMIT)]
    assert flags == [False] * buddy.DAILY_LIMIT
    assert ask(client, player_id, "what is 5 plus 5")["resting"] is True
    high = ask(client, player_id, "my uncle hit me")
    assert high["resting"] is False
    assert high["answer"] == CONCERN_REPLY


def test_resting_flag_is_false_for_no_match(client, player_id):
    assert ask(client, player_id, "what is 5 plus 5")["resting"] is False


def test_limit_resets_at_sri_lanka_midnight(client, player_id, fixed_clock):
    # 18:29 UTC is 23:59 in Sri Lanka; 18:31 UTC is 00:01 the next day there
    fixed_clock["now"] = datetime(2026, 3, 10, 18, 29, tzinfo=timezone.utc)
    for _ in range(buddy.DAILY_LIMIT):
        ask(client, player_id, "why do we cry")
    assert ask(client, player_id, "why do we cry")["answer"] == buddy.RESTING_REPLY

    fixed_clock["now"] = datetime(2026, 3, 10, 18, 31, tzinfo=timezone.utc)
    assert ask(client, player_id, "why do we cry")["remaining_today"] == buddy.DAILY_LIMIT - 1


def test_local_day_bounds():
    start, end = local_day_bounds_utc(datetime(2026, 3, 10, 18, 29, tzinfo=timezone.utc))
    assert start == datetime(2026, 3, 9, 18, 30)
    assert end == datetime(2026, 3, 10, 18, 30)
    start, _ = local_day_bounds_utc(datetime(2026, 3, 10, 18, 31, tzinfo=timezone.utc))
    assert start == datetime(2026, 3, 10, 18, 30)


def test_players_stay_separate(client, player_id):
    other_id = create_player(client, nickname="Nimal", avatar_id="owl")
    for _ in range(buddy.DAILY_LIMIT):
        ask(client, player_id, "why do we cry")
    assert ask(client, other_id, "why do we cry")["remaining_today"] == buddy.DAILY_LIMIT - 1
    assert len(messages(client, player_id)) == buddy.DAILY_LIMIT
    assert len(messages(client, other_id)) == 1


# --- validation and parent endpoint ----------------------------------------------

@pytest.mark.parametrize("question", ["", "   ", "a" * 151])
def test_invalid_question_gives_422(client, player_id, question):
    res = client.post(f"/players/{player_id}/buddy/ask", json={"question": question})
    assert res.status_code == 422


def test_question_is_trimmed(client, player_id):
    ask(client, player_id, "   why do we cry   ")
    assert messages(client, player_id)[0]["question"] == "why do we cry"


def test_unknown_player_gives_404(client):
    assert client.post("/players/nope/buddy/ask", json={"question": "why do we cry"}).status_code == 404


def test_parent_messages_need_pin_and_hide_model_fields(client, player_id, fixed_clock):
    ask(client, player_id, "why do we cry")
    fixed_clock["now"] = datetime(2026, 3, 10, 7, 0, tzinfo=timezone.utc)
    ask(client, player_id, "what does happy mean")

    url = f"/players/{player_id}/buddy/messages"
    assert client.get(url).status_code == 401
    assert client.get(url, headers={"X-Parent-Pin": "0000"}).status_code == 403

    listed = messages(client, player_id)
    assert [m["question"] for m in listed] == ["what does happy mean", "why do we cry"]
    for m in listed:
        assert set(m) == {"id", "question", "answer", "concern_level", "concern_categories", "created_at"}


def test_delete_one_message(client, player_id):
    ask(client, player_id, "why do we cry")
    ask(client, player_id, "what does happy mean")
    gone, keep = messages(client, player_id)

    url = f"/players/{player_id}/buddy/messages/{gone['id']}"
    assert client.delete(url, headers=PARENT).status_code == 204
    assert messages(client, player_id) == [keep]
    assert client.delete(url, headers=PARENT).status_code == 404


def test_delete_message_of_another_player_gives_404(client, player_id):
    other_id = create_player(client, nickname="Nimal")
    ask(client, other_id, "why do we cry")
    other_message = messages(client, other_id)[0]

    res = client.delete(f"/players/{player_id}/buddy/messages/{other_message['id']}", headers=PARENT)
    assert res.status_code == 404
    assert messages(client, other_id) == [other_message]


def test_delete_unknown_message_or_player_gives_404(client, player_id):
    ask(client, player_id, "why do we cry")
    message_id = messages(client, player_id)[0]["id"]
    assert client.delete(f"/players/{player_id}/buddy/messages/99999", headers=PARENT).status_code == 404
    assert client.delete(f"/players/nope/buddy/messages/{message_id}", headers=PARENT).status_code == 404
    assert client.delete("/players/nope/buddy/messages", headers=PARENT).status_code == 404
    assert len(messages(client, player_id)) == 1


def test_clear_all_messages_keeps_other_players(client, player_id):
    other_id = create_player(client, nickname="Nimal")
    ask(client, player_id, "why do we cry")
    ask(client, player_id, "i want to die")
    ask(client, other_id, "what does happy mean")

    url = f"/players/{player_id}/buddy/messages"
    assert client.delete(url, headers=PARENT).status_code == 204
    assert messages(client, player_id) == []
    assert [m["question"] for m in messages(client, other_id)] == ["what does happy mean"]
    assert client.delete(url, headers=PARENT).status_code == 204


def test_delete_and_clear_need_pin(client, player_id):
    ask(client, player_id, "why do we cry")
    message_id = messages(client, player_id)[0]["id"]
    url_one = f"/players/{player_id}/buddy/messages/{message_id}"
    url_all = f"/players/{player_id}/buddy/messages"

    for res in [client.delete(url_one), client.delete(url_all)]:
        assert res.status_code == 401
        assert res.json()["detail"] == "Parent PIN required"

    wrong = {"X-Parent-Pin": "0000"}
    for res in [client.delete(url_one, headers=wrong), client.delete(url_all, headers=wrong)]:
        assert res.status_code == 403
        assert res.json()["detail"] == "Wrong parent PIN"

    assert len(messages(client, player_id)) == 1


def test_deleting_questions_frees_up_the_daily_limit(client, player_id):
    for _ in range(buddy.DAILY_LIMIT):
        ask(client, player_id, "why do we cry")
    assert ask(client, player_id, "why do we cry")["resting"] is True

    first = messages(client, player_id)[-1]
    assert client.delete(f"/players/{player_id}/buddy/messages/{first['id']}", headers=PARENT).status_code == 204
    assert ask(client, player_id, "why do we cry")["remaining_today"] == 0

    assert client.delete(f"/players/{player_id}/buddy/messages", headers=PARENT).status_code == 204
    assert ask(client, player_id, "why do we cry")["remaining_today"] == buddy.DAILY_LIMIT - 1


def test_delete_player_removes_messages(db_client):
    client, session_local = db_client
    player_id = create_player(client)
    ask(client, player_id, "why do we cry")
    ask(client, player_id, "i want to die")
    assert client.delete(f"/players/{player_id}").status_code == 204
    with session_local() as db:
        assert db.query(BuddyMessage).count() == 0


# --- FAQ content -------------------------------------------------------------------

def sentences(text):
    return re.findall(r"[^.!?]+[.!?]+", text)


def test_faq_has_40_unique_items():
    assert len(FAQ) == 40
    assert len(FAQ_BY_ID) == 40


@pytest.mark.parametrize("item", FAQ, ids=[i["id"] for i in FAQ])
def test_faq_item_shape(item):
    assert item["question"].strip()
    assert 3 <= len(item["phrasings"]) <= 6
    assert all(p.strip() for p in item["phrasings"])
    assert 1 <= len(sentences(item["answer"])) <= 3, item["answer"]
    assert len(EMOJI.findall(item["answer"])) <= 1
    lowered = item["answer"].lower()
    assert "don't feel sad" not in lowered and "stop being angry" not in lowered


@pytest.mark.parametrize("item", FAQ, ids=[i["id"] for i in FAQ])
def test_faq_texts_are_not_high_concern(item):
    # A high-concern phrasing could never be reached, since those questions get the safety reply
    for text in [item["question"], *item["phrasings"]]:
        assert check_concern(text)[0] != "high", text


def test_suggested_ids_exist():
    assert len(SUGGESTED_IDS) == 8
    assert len(set(SUGGESTED_IDS)) == 8
    assert all(i in FAQ_BY_ID for i in SUGGESTED_IDS)

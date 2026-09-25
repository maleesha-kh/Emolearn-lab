from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.exc import IntegrityError

from app.db.models import DiaryEntry, ParentTip
from app.services.safety import CONCERN_REPLY, HIGH_PHRASES, WATCH_PHRASES, check_concern, normalize

PIN = "1234"
PARENT = {"X-Parent-Pin": PIN}


def create_player(client, nickname="Amara", avatar_id="fox"):
    return client.post("/players", json={"nickname": nickname, "avatar_id": avatar_id}).json()


def setup_pin(client):
    assert client.post("/parent/pin/setup", json={"pin": PIN}).status_code == 201


def post_entry(client, player_id, **overrides):
    body = {"emotion": "happy", "intensity": "little", "reason_tags": ["friends"]}
    body.update(overrides)
    return client.post(f"/players/{player_id}/diary", json=body)


def list_entries(client, player_id, **params):
    res = client.get(f"/players/{player_id}/diary", params=params, headers=PARENT)
    assert res.status_code == 200
    return res.json()


@pytest.fixture()
def player_id(client):
    setup_pin(client)
    return create_player(client)["id"]


# --- create ----------------------------------------------------------------

def test_create_with_chips_only(client, player_id):
    res = post_entry(client, player_id, emotion="sad", intensity="lot", reason_tags=["school", "pets"])
    assert res.status_code == 201
    body = res.json()
    assert body["player_id"] == player_id
    assert body["emotion"] == "sad"
    assert body["intensity"] == "lot"
    assert body["reason_tags"] == ["school", "pets"]
    assert body["note"] is None
    assert body["concern_flag"] is False
    assert body["bot_reply"] is None
    assert body["created_at"]
    for field in ["reason_used", "reason_source", "reason_confidence", "sentiment", "sentiment_confidence"]:
        assert body[field] is None


def test_create_with_note_only(client, player_id):
    res = post_entry(client, player_id, reason_tags=[], note="We went to the park")
    assert res.status_code == 201
    assert res.json()["reason_tags"] == []
    assert res.json()["note"] == "We went to the park"


def test_create_with_chips_and_note(client, player_id):
    res = post_entry(client, player_id, reason_tags=["family"], note="Grandma visited")
    assert res.status_code == 201
    assert res.json()["reason_tags"] == ["family"]
    assert res.json()["note"] == "Grandma visited"


def test_tags_keep_tap_order_and_drop_duplicates(client, player_id):
    res = post_entry(client, player_id, reason_tags=["pets", "school", "pets", "other"])
    assert res.json()["reason_tags"] == ["pets", "school", "other"]


@pytest.mark.parametrize("note", [None, "", "    "])
def test_rejected_when_no_tags_and_no_note(client, player_id, note):
    res = post_entry(client, player_id, reason_tags=[], note=note)
    assert res.status_code == 422
    assert list_entries(client, player_id) == []


@pytest.mark.parametrize(
    "overrides",
    [
        {"emotion": "scared"},
        {"emotion": "Happy"},
        {"intensity": "medium"},
        {"reason_tags": ["homework"]},
        {"reason_tags": ["school", "School"]},
    ],
)
def test_invalid_input_gives_422(client, player_id, overrides):
    assert post_entry(client, player_id, **overrides).status_code == 422


def test_note_is_trimmed_and_empty_becomes_null(client, player_id):
    assert post_entry(client, player_id, note="  I played tag  ").json()["note"] == "I played tag"
    assert post_entry(client, player_id, note="   ").json()["note"] is None


def test_note_limited_to_200_chars(client, player_id):
    assert post_entry(client, player_id, note="a" * 200).status_code == 201
    assert post_entry(client, player_id, note="  " + "a" * 200 + "  ").status_code == 201
    assert post_entry(client, player_id, note="a" * 201).status_code == 422


def test_create_for_unknown_player_gives_404(client):
    assert post_entry(client, "nope").status_code == 404


def test_high_note_sets_flag_and_fixed_reply(client, player_id):
    body = post_entry(client, player_id, emotion="sad", note="my uncle hit me").json()
    assert body["concern_flag"] is True
    assert body["concern_level"] == "high"
    assert body["concern_categories"] == ["hurt_by_someone"]
    assert body["bot_reply"] == CONCERN_REPLY
    assert body["bot_reply"] == "Thank you for telling me. Please tell a grown-up you trust right away. 💙"


def test_watch_note_is_recorded_without_flag_or_reply(client, player_id):
    body = post_entry(client, player_id, emotion="sad", note="my dog ran away").json()
    assert body["concern_flag"] is False
    assert body["concern_level"] == "watch"
    assert body["concern_categories"] == ["danger"]
    assert body["bot_reply"] is None

    listed = list_entries(client, player_id)[0]
    assert listed["concern_level"] == "watch"
    assert listed["concern_categories"] == ["danger"]


def test_plain_entry_has_no_concern(client, player_id):
    for note in [None, "we played cricket"]:
        body = post_entry(client, player_id, note=note).json()
        assert body["concern_flag"] is False
        assert body["concern_level"] == "none"
        assert body["concern_categories"] == []


def test_database_rejects_unknown_concern_level(db_client):
    client, session_local = db_client
    player_id = create_player(client)["id"]
    with session_local() as db:
        db.add(DiaryEntry(player_id=player_id, emotion="happy", intensity="lot", reason_tags=[], concern_level="medium"))
        with pytest.raises(IntegrityError):
            db.commit()


def test_database_rejects_unknown_emotion(db_client):
    client, session_local = db_client
    player_id = create_player(client)["id"]
    with session_local() as db:
        db.add(DiaryEntry(player_id=player_id, emotion="scared", intensity="lot", reason_tags=[]))
        with pytest.raises(IntegrityError):
            db.commit()


# --- list ------------------------------------------------------------------

def test_list_is_newest_first(client, player_id):
    ids = [post_entry(client, player_id, emotion=e).json()["id"] for e in ["happy", "sad", "angry"]]
    assert [e["id"] for e in list_entries(client, player_id)] == ids[::-1]


def test_list_orders_by_created_at(db_client):
    client, session_local = db_client
    setup_pin(client)
    player_id = create_player(client)["id"]
    older = post_entry(client, player_id).json()["id"]
    newer = post_entry(client, player_id).json()["id"]
    with session_local() as db:
        db.get(DiaryEntry, older).created_at = datetime.now(timezone.utc) + timedelta(days=1)
        db.commit()
    assert [e["id"] for e in list_entries(client, player_id)] == [older, newer]


def test_list_limit(client, player_id):
    for _ in range(5):
        post_entry(client, player_id)
    assert len(list_entries(client, player_id, limit=2)) == 2
    assert len(list_entries(client, player_id)) == 5
    for bad in [0, -1, 201]:
        assert client.get(f"/players/{player_id}/diary", params={"limit": bad}, headers=PARENT).status_code == 422


def test_list_unknown_player_gives_404(client):
    setup_pin(client)
    assert client.get("/players/nope/diary", headers=PARENT).status_code == 404


# --- delete ----------------------------------------------------------------

def test_delete_works(client, player_id):
    keep = post_entry(client, player_id).json()["id"]
    gone = post_entry(client, player_id).json()["id"]

    assert client.delete(f"/players/{player_id}/diary/{gone}", headers=PARENT).status_code == 204
    assert [e["id"] for e in list_entries(client, player_id)] == [keep]
    assert client.delete(f"/players/{player_id}/diary/{gone}", headers=PARENT).status_code == 404


def test_delete_unknown_entry_or_player_gives_404(client, player_id):
    entry_id = post_entry(client, player_id).json()["id"]
    assert client.delete(f"/players/{player_id}/diary/99999", headers=PARENT).status_code == 404
    assert client.delete(f"/players/nope/diary/{entry_id}", headers=PARENT).status_code == 404


def test_delete_entry_removes_its_parent_tip(db_client):
    client, session_local = db_client
    setup_pin(client)
    player_id = create_player(client)["id"]
    entry_id = post_entry(client, player_id).json()["id"]
    with session_local() as db:
        db.add(ParentTip(diary_entry_id=entry_id, summary="s", tips=["a", "b"], talk_starter="t", source="tip_bank"))
        db.commit()

    assert client.delete(f"/players/{player_id}/diary/{entry_id}", headers=PARENT).status_code == 204
    with session_local() as db:
        assert db.query(ParentTip).count() == 0


def test_delete_player_removes_diary_and_tips(db_client):
    client, session_local = db_client
    player_id = create_player(client)["id"]
    entry_id = post_entry(client, player_id).json()["id"]
    post_entry(client, player_id, note="my uncle hit me")
    with session_local() as db:
        db.add(ParentTip(diary_entry_id=entry_id, summary="s", tips=[], talk_starter="t", source="concern"))
        db.commit()

    assert client.delete(f"/players/{player_id}").status_code == 204
    with session_local() as db:
        assert db.query(DiaryEntry).count() == 0
        assert db.query(ParentTip).count() == 0


# --- players stay separate -------------------------------------------------

def test_players_stay_separate(client, player_id):
    other_id = create_player(client, nickname="Nimal", avatar_id="owl")["id"]
    mine = post_entry(client, player_id, emotion="happy").json()["id"]
    theirs = post_entry(client, other_id, emotion="angry").json()["id"]

    assert [e["id"] for e in list_entries(client, player_id)] == [mine]
    assert [e["id"] for e in list_entries(client, other_id)] == [theirs]

    assert client.delete(f"/players/{player_id}/diary/{theirs}", headers=PARENT).status_code == 404
    assert [e["id"] for e in list_entries(client, other_id)] == [theirs]


# --- parent protection -----------------------------------------------------

def test_list_and_delete_need_pin(client, player_id):
    entry_id = post_entry(client, player_id).json()["id"]
    url_list = f"/players/{player_id}/diary"
    url_delete = f"/players/{player_id}/diary/{entry_id}"

    for res in [client.get(url_list), client.delete(url_delete)]:
        assert res.status_code == 401
        assert res.json()["detail"] == "Parent PIN required"

    wrong = {"X-Parent-Pin": "0000"}
    for res in [client.get(url_list, headers=wrong), client.delete(url_delete, headers=wrong)]:
        assert res.status_code == 403
        assert res.json()["detail"] == "Wrong parent PIN"

    assert len(list_entries(client, player_id)) == 1


def test_pin_required_before_404(client):
    assert client.get("/players/nope/diary").status_code == 401


def test_no_pin_set_yet_gives_403(client):
    player_id = create_player(client)["id"]
    res = client.get(f"/players/{player_id}/diary", headers=PARENT)
    assert res.status_code == 403
    assert res.json()["detail"] == "No parent PIN set yet"


def test_create_does_not_need_pin(client):
    player_id = create_player(client)["id"]
    assert post_entry(client, player_id).status_code == 201


def test_pin_change_is_respected(client, player_id):
    client.put("/parent/pin", json={"current_pin": PIN, "new_pin": "5678"})
    assert client.get(f"/players/{player_id}/diary", headers=PARENT).status_code == 403
    assert client.get(f"/players/{player_id}/diary", headers={"X-Parent-Pin": "5678"}).status_code == 200


# --- safety filter -----------------------------------------------------------

MUST_BE_HIGH = [
    ("my uncle hit me", "hurt_by_someone"),
    ("my brother hurted me", "hurt_by_someone"),
    ("someone kicked me at school", "hurt_by_someone"),
    ("hiiiiit meeee", "hurt_by_someone"),
    ("he   HIT,   me", "hurt_by_someone"),
    ("i want to die", "self_harm"),
    ("I wish I was dead", "self_harm"),
    ("i want to kill myself", "self_harm"),
    ("i dont want to live anymore", "self_harm"),
    ("i am scard of him", "fear_of_a_person"),
    ("i dont want to go home", "fear_of_a_person"),
    ("he threatened me", "fear_of_a_person"),
    ("I'm scared of my step dad", "fear_of_a_person"),
    ("im scard of my thaththa", "fear_of_a_person"),
    ("i am afraid of my uncle", "fear_of_a_person"),
    ("he said dont tell anyone", "secrets_or_touching"),
    ("He said don't tell anyone", "secrets_or_touching"),
    ("he said don’t tell anyone!!!", "secrets_or_touching"),
    ("she touched my privates", "secrets_or_touching"),
    ("it is our secret", "secrets_or_touching"),
    ("he touched me", "secrets_or_touching"),
    ("i want to run away", "danger"),
    ("they locked me in the room", "danger"),
    ("a man tried to kidnap me", "danger"),
]

MUST_BE_WATCH = [
    ("my dog ran away", "danger"),
    ("grandma kissed me goodnight", "secrets_or_touching"),
    ("she touched my crayons", "secrets_or_touching"),
    ("the teacher shouted at me", "fear_of_a_person"),
    ("i got a new water gun", "danger"),
    ("my puppy follows me everywhere", "fear_of_a_person"),
    ("we made a secret party for amma", "secrets_or_touching"),
    ("i fell and my knee is bleeding", "danger"),
    ("my friend pushed me in the line", "hurt_by_someone"),
    ("i am scared of my dog", "fear_of_a_person"),
    ("scared of my teacher", "fear_of_a_person"),
]

MUST_BE_NONE = [
    "i hit the ball far",
    "my white shirt got dirty",
    "we played cricket",
    "i got a star from teacher",
    "i played with my dog",
    "my friend shared her lunch with me",
    "we baked a cake with grandma",
    "i was sad because it rained",
    "my brother took my crayons",
    "my cat sleeps on my bed",
    "",
]


@pytest.mark.parametrize("sentence, category", MUST_BE_HIGH)
def test_safety_high(sentence, category):
    level, categories = check_concern(sentence)
    assert level == "high", sentence
    assert category in categories


@pytest.mark.parametrize("sentence, category", MUST_BE_WATCH)
def test_safety_watch(sentence, category):
    level, categories = check_concern(sentence)
    assert level == "watch", sentence
    assert category in categories


@pytest.mark.parametrize("sentence", MUST_BE_NONE)
def test_safety_none(sentence):
    assert check_concern(sentence) == ("none", [])


def test_high_lists_categories_from_both_levels():
    assert check_concern("he hit me with a knife") == ("high", ["hurt_by_someone", "danger"])
    assert check_concern("i want to die") == ("high", ["self_harm"])


def test_watch_lists_all_watch_categories():
    assert check_concern("a stranger had a knife") == ("watch", ["fear_of_a_person", "danger"])


def test_both_levels_cover_every_category():
    categories = {"hurt_by_someone", "self_harm", "fear_of_a_person", "secrets_or_touching", "danger"}
    for phrases in [HIGH_PHRASES, WATCH_PHRASES]:
        assert set(phrases) == categories
        assert all(phrases.values())


def test_normalize():
    assert normalize("  Don’t   TELL!!  ") == "don't tell"
    assert normalize("hiiiit meee") == "hiit mee"
    assert normalize("“Hello,” she said.") == "hello she said"
    assert normalize("1000 cats") == "1000 cats"

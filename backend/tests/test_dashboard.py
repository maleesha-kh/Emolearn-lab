from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from sqlalchemy.orm import Session as SASession

from app.db.models import GameSession, Player, PlayerBadge, Round

EMOTIONS = ["happy", "sad", "angry", "surprised"]
PIN = "1234"
PARENT = {"X-Parent-Pin": PIN}


@pytest.fixture(autouse=True)
def parent_pin(client):
    assert client.post("/parent/pin/setup", json={"pin": PIN}).status_code == 201


def create_player(client, nickname="Amara", avatar_id="fox"):
    return client.post("/players", json={"nickname": nickname, "avatar_id": avatar_id}).json()


def start_session(client, player_id, mood_checkin="happy"):
    return client.post("/sessions", json={"player_id": player_id, "mood_checkin": mood_checkin}).json()


def save_round(client, session_id, round_no, target_emotion, correct):
    res = client.post(
        f"/sessions/{session_id}/rounds",
        json={
            "round_no": round_no,
            "target_emotion": target_emotion,
            "chosen_image": f"img{round_no}.png",
            "child_correct": correct,
            "predicted_emotion": target_emotion if correct else None,
            "confidence": 0.9 if correct else None,
        },
    )
    assert res.status_code == 201


def finish(client, session_id):
    res = client.patch(f"/sessions/{session_id}/finish")
    assert res.status_code == 200
    return res.json()["session"]


def play_session(client, player_id, correct=(), mood_checkin="happy"):
    """Plays one full 4-round session, one round per emotion. correct: the
    emotions the child got right; every other round is saved as wrong."""
    session_id = start_session(client, player_id, mood_checkin)["id"]
    for i, emotion in enumerate(EMOTIONS, start=1):
        save_round(client, session_id, i, emotion, emotion in correct)
    return finish(client, session_id)


def dashboard(client, player_id):
    res = client.get(f"/players/{player_id}/dashboard", headers=PARENT)
    assert res.status_code == 200
    return res.json()


# --- dashboard: empty / basic shape ----------------------------------------

def test_empty_player_dashboard(client):
    player_id = create_player(client)["id"]
    body = dashboard(client, player_id)

    assert body["total_sessions"] == 0
    assert body["average_score"] is None
    assert body["best_emotion"] is None
    assert body["needs_practice"] is None
    assert body["all_equal"] is False
    assert body["badges"] == []
    assert body["sessions"] == []
    for stat in body["emotion_accuracy"].values():
        assert stat == {"correct": 0, "attempts": 0, "percent": None}


def test_average_score_over_several_sessions(client):
    player_id = create_player(client)["id"]
    play_session(client, player_id, {"happy", "sad", "angry"})  # 3
    play_session(client, player_id, EMOTIONS)  # 4
    play_session(client, player_id, {"happy"})  # 1

    body = dashboard(client, player_id)
    assert body["total_sessions"] == 3
    # (3 + 4 + 1) / 3 = 2.666... -> 2.7
    assert body["average_score"] == 2.7


def test_percent_rounding(client):
    player_id = create_player(client)["id"]
    play_session(client, player_id, {"happy"})
    play_session(client, player_id)
    play_session(client, player_id)

    body = dashboard(client, player_id)
    # 1/3 correct = 33.333...% -> 33.3
    assert body["emotion_accuracy"]["happy"] == {"correct": 1, "attempts": 3, "percent": 33.3}


def test_best_and_needs_practice_choice(client):
    player_id = create_player(client)["id"]
    # happy 100%, sad 50%, surprised 50%, angry 0%
    play_session(client, player_id, {"happy", "sad", "surprised"})
    play_session(client, player_id, {"happy"})

    body = dashboard(client, player_id)
    assert body["best_emotion"] == "happy"
    assert body["needs_practice"] == "angry"
    assert body["all_equal"] is False


def test_all_equal_case(client):
    player_id = create_player(client)["id"]
    play_session(client, player_id, EMOTIONS)
    play_session(client, player_id)  # every emotion at 50%

    body = dashboard(client, player_id)
    assert body["all_equal"] is True
    assert body["best_emotion"] is None
    assert body["needs_practice"] is None


def test_single_emotion_tried(db_client):
    # The API only finishes full 4-emotion sessions now, so a history where
    # only one emotion was ever tried has to be written to the db directly.
    client, session_local = db_client
    player_id = create_player(client)["id"]
    db = session_local()
    try:
        session = GameSession(player_id=player_id, finished_at=datetime.now(timezone.utc), score=1, stars=1)
        db.add(session)
        db.flush()
        for round_no, correct in [(1, True), (2, False)]:
            db.add(Round(
                session_id=session.id, round_no=round_no, target_emotion="happy",
                chosen_image="a.png", child_correct=correct,
            ))
        db.commit()
    finally:
        db.close()

    body = dashboard(client, player_id)
    assert body["best_emotion"] == "happy"
    assert body["needs_practice"] is None
    assert body["all_equal"] is False


def test_tie_order_picks_first_in_emotion_order(client):
    player_id = create_player(client)["id"]
    # happy and sad tie for best (80%); angry and surprised tie for worst (20%).
    for _ in range(3):
        play_session(client, player_id, {"happy", "sad"})
    play_session(client, player_id, {"happy", "sad", "angry"})
    play_session(client, player_id, {"surprised"})

    body = dashboard(client, player_id)
    assert body["best_emotion"] == "happy"
    assert body["needs_practice"] == "angry"


def test_unfinished_sessions_ignored_in_dashboard(client):
    player_id = create_player(client)["id"]
    session_id = start_session(client, player_id)["id"]
    save_round(client, session_id, 1, "happy", True)  # never finished

    body = dashboard(client, player_id)
    assert body["total_sessions"] == 0
    assert body["average_score"] is None
    assert body["emotion_accuracy"]["happy"] == {"correct": 0, "attempts": 0, "percent": None}


# --- rename (PATCH) ---------------------------------------------------------

def test_rename_works(client):
    player_id = create_player(client, nickname="Amara", avatar_id="fox")["id"]
    res = client.patch(f"/players/{player_id}", headers=PARENT, json={"nickname": "Nova"})
    assert res.status_code == 200
    assert res.json() == {"id": player_id, "nickname": "Nova", "avatar_id": "fox"}

    assert client.get(f"/players/{player_id}").json()["nickname"] == "Nova"


def test_rename_duplicate_gives_409(client):
    create_player(client, nickname="Amara", avatar_id="fox")
    other_id = create_player(client, nickname="Nova", avatar_id="owl")["id"]

    res = client.patch(f"/players/{other_id}", headers=PARENT, json={"nickname": "amara", "avatar_id": "fox"})
    assert res.status_code == 409


def test_patch_missing_player_404(client):
    res = client.patch("/players/missing-id", headers=PARENT, json={"nickname": "Nova"})
    assert res.status_code == 404


# --- delete ------------------------------------------------------------------

def test_delete_removes_everything(db_client):
    client, session_local = db_client
    player_id = create_player(client)["id"]
    session = play_session(client, player_id, EMOTIONS)
    session_id = session["id"]

    res = client.delete(f"/players/{player_id}", headers=PARENT)
    assert res.status_code == 204

    db = session_local()
    try:
        assert db.get(Player, player_id) is None
        assert db.query(GameSession).filter(GameSession.player_id == player_id).count() == 0
        assert db.query(Round).filter(Round.session_id == session_id).count() == 0
        assert db.query(PlayerBadge).filter(PlayerBadge.player_id == player_id).count() == 0
    finally:
        db.close()


def test_delete_missing_gives_404(client):
    res = client.delete("/players/missing-id", headers=PARENT)
    assert res.status_code == 404


def test_delete_interrupted_leaves_player_intact(db_client):
    """Simulates a crash right at commit time: every delete statement has
    already been issued inside the transaction, but nothing is persisted.
    The route's except-block rollback must undo all of it."""
    client, session_local = db_client
    player_id = create_player(client)["id"]
    play_session(client, player_id, {"happy"})

    with patch.object(SASession, "commit", side_effect=RuntimeError("simulated crash")):
        with pytest.raises(RuntimeError):
            client.delete(f"/players/{player_id}", headers=PARENT)

    db = session_local()
    try:
        assert db.get(Player, player_id) is not None
        assert db.query(GameSession).filter(GameSession.player_id == player_id).count() == 1
    finally:
        db.close()


# --- CSV report --------------------------------------------------------------

def test_csv_header_only_for_new_player(client):
    player_id = create_player(client)["id"]
    res = client.get(f"/players/{player_id}/report.csv", headers=PARENT)
    assert res.status_code == 200
    lines = res.text.strip("﻿").strip().splitlines()
    assert lines == ["Date,Time,Mood,Score,Stars,Happy,Sad,Angry,Surprised"]


def test_csv_rows_and_correct_wrong_values(client):
    player_id = create_player(client)["id"]
    play_session(client, player_id, {"happy", "angry"}, mood_checkin="happy")

    res = client.get(f"/players/{player_id}/report.csv", headers=PARENT)
    assert res.status_code == 200
    lines = res.text.strip("﻿").strip().splitlines()
    assert len(lines) == 2
    row = lines[1].split(",")
    # Date, Time, Mood, Score, Stars, Happy, Sad, Angry, Surprised
    assert row[2] == "happy"
    assert row[3] == "2"  # score: happy+angry correct, sad wrong
    assert row[5] == "Correct"  # Happy
    assert row[6] == "Wrong"  # Sad
    assert row[7] == "Correct"  # Angry
    assert row[8] == "Wrong"  # Surprised


def test_csv_oldest_first_and_unfinished_excluded(db_client):
    client, session_local = db_client
    player_id = create_player(client)["id"]

    first = play_session(client, player_id, {"happy"})
    second = play_session(client, player_id, {"sad"})

    # Force a clear, known ordering regardless of real-clock timing.
    db = session_local()
    try:
        s1 = db.get(GameSession, first["id"])
        s2 = db.get(GameSession, second["id"])
        # 06:00 UTC keeps the local date the same for any timezone from -06:00 to +18:00
        s1.finished_at = datetime(2026, 1, 1, 6, 0)
        s2.finished_at = datetime(2026, 1, 2, 6, 0)
        db.commit()
    finally:
        db.close()

    # An unfinished session must not appear in the report at all.
    unfinished_id = start_session(client, player_id)["id"]
    save_round(client, unfinished_id, 1, "angry", True)

    res = client.get(f"/players/{player_id}/report.csv", headers=PARENT)
    lines = res.text.strip("﻿").strip().splitlines()
    assert len(lines) == 3  # header + 2 finished sessions
    assert "2026-01-01" in lines[1]
    assert "2026-01-02" in lines[2]


def test_csv_filename_header_present(client):
    player_id = create_player(client, nickname="Amara")["id"]
    res = client.get(f"/players/{player_id}/report.csv", headers=PARENT)
    assert "Content-Disposition" in res.headers
    assert "emolearn_Amara_" in res.headers["Content-Disposition"]
    assert res.headers["Content-Disposition"].endswith('.csv"')


def test_csv_missing_player_404(client):
    res = client.get("/players/missing-id/report.csv", headers=PARENT)
    assert res.status_code == 404

from datetime import datetime, timezone

from app.db.models import GameSession

EMOTIONS = ["happy", "sad", "angry", "surprised"]


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
    return res.json()


def play_session(client, player_id, rounds):
    """rounds: list of (target_emotion, correct) tuples, 1 to 4 entries."""
    session_id = start_session(client, player_id)["id"]
    for i, (emotion, correct) in enumerate(rounds, start=1):
        save_round(client, session_id, i, emotion, correct)
    return finish(client, session_id)


def badge_ids(client, player_id):
    res = client.get(f"/players/{player_id}/badges")
    assert res.status_code == 200
    return {b["badge_id"] for b in res.json()}


# --- one test per badge --------------------------------------------------

def test_first_star_awarded_on_one_correct_round(client):
    player_id = create_player(client)["id"]
    result = play_session(client, player_id, [("happy", True)])
    assert "first-star" in result["new_badges"]
    assert "first-star" in badge_ids(client, player_id)


def test_emo_explorer_awarded_for_all_four_emotions(client):
    player_id = create_player(client)["id"]
    result = play_session(client, player_id, [("happy", True), ("sad", True), ("angry", True), ("surprised", True)])
    assert "emo-explorer" in result["new_badges"]


def test_happy_champ_awarded_for_five_correct_happy(client):
    player_id = create_player(client)["id"]
    play_session(client, player_id, [("happy", True), ("happy", True), ("happy", True), ("happy", True)])
    result = play_session(client, player_id, [("happy", True)])
    assert "happy-champ" in result["new_badges"]


def test_wow_expert_awarded_for_five_correct_surprised(client):
    player_id = create_player(client)["id"]
    play_session(
        client, player_id, [("surprised", True), ("surprised", True), ("surprised", True), ("surprised", True)]
    )
    result = play_session(client, player_id, [("surprised", True)])
    assert "wow-expert" in result["new_badges"]


def test_calm_master_awarded_for_five_sad_and_five_angry(client):
    player_id = create_player(client)["id"]
    play_session(client, player_id, [("sad", True), ("sad", True), ("sad", True), ("sad", True)])
    play_session(client, player_id, [("angry", True), ("angry", True), ("angry", True), ("angry", True)])
    result = play_session(client, player_id, [("sad", True), ("angry", True)])  # sad=5, angry=5

    assert "calm-master" in result["new_badges"]


def test_calm_master_not_awarded_with_five_sad_and_only_four_angry(client):
    player_id = create_player(client)["id"]
    play_session(client, player_id, [("sad", True), ("sad", True), ("sad", True), ("sad", True)])
    play_session(client, player_id, [("sad", True)])  # sad = 5
    play_session(client, player_id, [("angry", True), ("angry", True), ("angry", True), ("angry", True)])  # angry=4

    assert "calm-master" not in badge_ids(client, player_id)


def test_five_sessions_awarded_after_five_finished_sessions(client):
    player_id = create_player(client)["id"]
    for _ in range(4):
        play_session(client, player_id, [])
    result = play_session(client, player_id, [])
    assert "five-sessions" in result["new_badges"]


def test_perfect_game_awarded_for_a_session_with_score_four(client):
    player_id = create_player(client)["id"]
    result = play_session(
        client, player_id, [("happy", True), ("happy", True), ("happy", True), ("happy", True)]
    )
    assert "perfect-game" in result["new_badges"]


def test_super_teacher_awarded_for_twenty_correct_rounds(client):
    player_id = create_player(client)["id"]
    for _ in range(4):
        play_session(
            client, player_id, [("happy", True), ("sad", True), ("angry", True), ("surprised", True)]
        )
    result = play_session(
        client, player_id, [("happy", True), ("sad", True), ("angry", True), ("surprised", True)]
    )
    assert "super-teacher" in result["new_badges"]


# --- badge never awarded twice -------------------------------------------

def test_badge_never_awarded_twice(client):
    player_id = create_player(client)["id"]
    first = play_session(client, player_id, [("happy", True)])
    assert "first-star" in first["new_badges"]

    second = play_session(client, player_id, [("happy", True)])
    assert "first-star" not in second["new_badges"]

    ids = [b["badge_id"] for b in client.get(f"/players/{player_id}/badges").json()]
    assert ids.count("first-star") == 1


# --- new player has no badges ---------------------------------------------

def test_new_player_has_no_badges(client):
    player_id = create_player(client)["id"]
    assert client.get(f"/players/{player_id}/badges").json() == []
    assert client.get(f"/players/{player_id}/profile").json()["badges"] == []


# --- unfinished sessions never count ---------------------------------------

def test_unfinished_session_never_earns_badges(client):
    player_id = create_player(client)["id"]
    session_id = start_session(client, player_id)["id"]
    save_round(client, session_id, 1, "happy", True)
    # never finished

    assert badge_ids(client, player_id) == set()


# --- comeback-kid ----------------------------------------------------------

def test_comeback_kid_awarded_low_then_higher_score(client):
    player_id = create_player(client)["id"]
    play_session(
        client, player_id, [("happy", True), ("happy", True), ("happy", False), ("happy", False)]
    )  # score 2
    result = play_session(
        client, player_id, [("happy", True), ("happy", True), ("happy", False), ("happy", False)]
    )  # score 2, equal (not higher) than the previous session
    assert "comeback-kid" not in result["new_badges"]

    result2 = play_session(
        client, player_id, [("happy", True), ("happy", True), ("happy", True), ("happy", False)]
    )  # score 3, follows a score of 2
    assert "comeback-kid" in result2["new_badges"]


def test_comeback_kid_not_awarded_high_then_low_score(client):
    player_id = create_player(client)["id"]
    play_session(
        client, player_id, [("happy", True), ("happy", True), ("happy", True), ("happy", True)]
    )  # score 4
    result = play_session(client, player_id, [("happy", True), ("happy", False), ("happy", False), ("happy", False)])  # score 1
    assert "comeback-kid" not in result["new_badges"]
    assert "comeback-kid" not in badge_ids(client, player_id)


def test_comeback_kid_not_awarded_by_single_low_score(client):
    player_id = create_player(client)["id"]
    result = play_session(client, player_id, [("happy", False), ("happy", False), ("happy", False), ("happy", False)])  # score 0
    assert "comeback-kid" not in result["new_badges"]
    assert "comeback-kid" not in badge_ids(client, player_id)


# --- best-friend -------------------------------------------------------------

def _set_finished_at(session_local, session_id, when):
    db = session_local()
    try:
        session = db.get(GameSession, session_id)
        session.finished_at = when
        db.commit()
    finally:
        db.close()


def test_best_friend_same_day_sessions_count_as_one_day(db_client):
    client, session_local = db_client
    player_id = create_player(client)["id"]
    for _ in range(3):
        play_session(client, player_id, [])  # all finished "now", same real day

    assert "best-friend" not in badge_ids(client, player_id)


def test_best_friend_awarded_across_five_distinct_local_days(db_client):
    client, session_local = db_client
    player_id = create_player(client)["id"]

    # Noon UTC keeps the local calendar date identical in every timezone
    # within +/-12h of UTC (including Sri Lanka, UTC+5:30).
    base = datetime(2026, 1, 1, 6, 0, 0, tzinfo=timezone.utc)
    for day_offset in range(4):
        session_id = start_session(client, player_id)["id"]
        save_round(client, session_id, 1, "happy", True)
        res = client.patch(f"/sessions/{session_id}/finish")
        assert res.status_code == 200
        when = base.replace(day=1 + day_offset)
        _set_finished_at(session_local, session_id, when)

    assert "best-friend" not in badge_ids(client, player_id)

    # 5th session finishes for real, triggering the recompute over all 5.
    result = play_session(client, player_id, [("happy", True)])
    assert "best-friend" in result["new_badges"]

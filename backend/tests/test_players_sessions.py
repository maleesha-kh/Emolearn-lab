import pytest

from app.db.models import GameSession, Round

EMOTIONS = ["happy", "sad", "angry", "surprised"]


def create_player(client, nickname="Amara", avatar_id="fox"):
    return client.post("/players", json={"nickname": nickname, "avatar_id": avatar_id})


def start_session(client, player_id, mood_checkin="happy"):
    return client.post("/sessions", json={"player_id": player_id, "mood_checkin": mood_checkin})


def play_full_session(client, player_id, results):
    session_id = start_session(client, player_id).json()["id"]
    for i, correct in enumerate(results, start=1):
        res = client.post(
            f"/sessions/{session_id}/rounds",
            json={
                "round_no": i,
                "target_emotion": EMOTIONS[i - 1],
                "chosen_image": f"img{i}.png",
                "child_correct": correct,
                "predicted_emotion": EMOTIONS[i - 1] if correct else None,
                "confidence": 0.9 if correct else None,
            },
        )
        assert res.status_code == 201
    return session_id


def test_create_player(client):
    res = create_player(client)
    assert res.status_code == 201
    body = res.json()
    assert body["nickname"] == "Amara"
    assert body["avatar_id"] == "fox"
    assert body["id"]


def test_duplicate_player_returns_409(client):
    create_player(client)
    res = create_player(client, nickname="  amara  ")
    assert res.status_code == 409


def test_start_session_and_save_four_rounds(client):
    player_id = create_player(client).json()["id"]
    session_id = play_full_session(client, player_id, [True, True, False, True])
    assert session_id


def test_finish_calculates_score_from_rounds(client):
    player_id = create_player(client).json()["id"]
    session_id = play_full_session(client, player_id, [True, True, False, True])

    res = client.patch(f"/sessions/{session_id}/finish")
    assert res.status_code == 200
    body = res.json()["session"]
    assert body["score"] == 3
    assert body["stars"] == 3
    assert body["finished_at"] is not None
    assert "+00:00" in body["finished_at"] or body["finished_at"].endswith("Z")


def test_profile_numbers_correct(client):
    player_id = create_player(client).json()["id"]
    session_id = play_full_session(client, player_id, [True, True, False, True])
    client.patch(f"/sessions/{session_id}/finish")

    res = client.get(f"/players/{player_id}/profile")
    assert res.status_code == 200
    body = res.json()
    assert body["sessions_played"] == 1
    assert body["total_stars"] == 3
    assert body["emotion_stats"]["happy"] == {"correct": 1, "attempts": 1}
    assert body["emotion_stats"]["sad"] == {"correct": 1, "attempts": 1}
    assert body["emotion_stats"]["angry"] == {"correct": 0, "attempts": 1}
    assert body["emotion_stats"]["surprised"] == {"correct": 1, "attempts": 1}
    assert len(body["recent_sessions"]) == 1
    assert len(body["recent_sessions"][0]["rounds"]) == 4


def test_unfinished_session_ignored_in_stats(client):
    player_id = create_player(client).json()["id"]
    play_full_session(client, player_id, [True, True, True, True])  # never finished

    res = client.get(f"/players/{player_id}/profile")
    body = res.json()
    assert body["sessions_played"] == 0
    assert body["total_stars"] == 0
    assert body["recent_sessions"] == []
    for stat in body["emotion_stats"].values():
        assert stat == {"correct": 0, "attempts": 0}


def test_new_player_profile_is_empty(client):
    player_id = create_player(client).json()["id"]
    res = client.get(f"/players/{player_id}/profile")
    assert res.status_code == 200
    body = res.json()
    assert body["total_stars"] == 0
    assert body["sessions_played"] == 0
    assert body["recent_sessions"] == []
    for stat in body["emotion_stats"].values():
        assert stat == {"correct": 0, "attempts": 0}


def test_saving_round_twice_is_rejected(client):
    player_id = create_player(client).json()["id"]
    session_id = start_session(client, player_id).json()["id"]
    payload = {"round_no": 1, "target_emotion": "happy", "chosen_image": "a.png", "child_correct": True}

    assert client.post(f"/sessions/{session_id}/rounds", json=payload).status_code == 201
    res = client.post(f"/sessions/{session_id}/rounds", json=payload)
    assert res.status_code == 409


# --- point 2: emotion whitelist validation -----------------------------

def test_invalid_target_emotion_rejected(client):
    player_id = create_player(client).json()["id"]
    session_id = start_session(client, player_id).json()["id"]
    res = client.post(
        f"/sessions/{session_id}/rounds",
        json={"round_no": 1, "target_emotion": "excited", "chosen_image": "a.png", "child_correct": True},
    )
    assert res.status_code == 422


def test_invalid_predicted_emotion_rejected(client):
    player_id = create_player(client).json()["id"]
    session_id = start_session(client, player_id).json()["id"]
    res = client.post(
        f"/sessions/{session_id}/rounds",
        json={
            "round_no": 1,
            "target_emotion": "happy",
            "chosen_image": "a.png",
            "child_correct": True,
            "predicted_emotion": "meh",
        },
    )
    assert res.status_code == 422


def test_null_predicted_emotion_is_allowed(client):
    player_id = create_player(client).json()["id"]
    session_id = start_session(client, player_id).json()["id"]
    res = client.post(
        f"/sessions/{session_id}/rounds",
        json={
            "round_no": 1,
            "target_emotion": "happy",
            "chosen_image": "a.png",
            "child_correct": True,
            "predicted_emotion": None,
        },
    )
    assert res.status_code == 201


def test_round_no_out_of_range_rejected(client):
    player_id = create_player(client).json()["id"]
    session_id = start_session(client, player_id).json()["id"]
    res = client.post(
        f"/sessions/{session_id}/rounds",
        json={"round_no": 5, "target_emotion": "happy", "chosen_image": "a.png", "child_correct": True},
    )
    assert res.status_code == 422


# --- point 3: finish is idempotent --------------------------------------

def test_finish_twice_does_not_change_result(client):
    player_id = create_player(client).json()["id"]
    session_id = play_full_session(client, player_id, [True, True, True, True])

    first = client.patch(f"/sessions/{session_id}/finish").json()
    second = client.patch(f"/sessions/{session_id}/finish").json()
    assert first["session"] == second["session"]
    assert second["new_badges"] == []


def test_round_rejected_after_finish(client):
    player_id = create_player(client).json()["id"]
    session_id = play_full_session(client, player_id, [True, True, True, True])
    client.patch(f"/sessions/{session_id}/finish")

    res = client.post(
        f"/sessions/{session_id}/rounds",
        json={"round_no": 4, "target_emotion": "happy", "chosen_image": "a.png", "child_correct": True},
    )
    assert res.status_code == 409


# --- only complete 4-emotion sessions can be finished -----------------

@pytest.mark.parametrize("round_count", [0, 1, 3])
def test_finish_rejected_with_fewer_than_four_rounds(client, round_count):
    player_id = create_player(client).json()["id"]
    session_id = play_full_session(client, player_id, [True] * round_count)

    res = client.patch(f"/sessions/{session_id}/finish")
    assert res.status_code == 409

    profile = client.get(f"/players/{player_id}/profile").json()
    assert profile["sessions_played"] == 0


def test_finish_rejected_with_repeated_emotions(db_client):
    # The rounds route already blocks repeats, so the rounds are written to
    # the db directly to check finish's own guard.
    client, session_local = db_client
    player_id = create_player(client).json()["id"]
    session_id = start_session(client, player_id).json()["id"]
    db = session_local()
    try:
        for round_no, emotion in enumerate(["happy", "happy", "sad", "angry"], start=1):
            db.add(Round(
                session_id=session_id, round_no=round_no, target_emotion=emotion,
                chosen_image="a.png", child_correct=True,
            ))
        db.commit()
    finally:
        db.close()

    res = client.patch(f"/sessions/{session_id}/finish")
    assert res.status_code == 409

    db = session_local()
    try:
        assert db.get(GameSession, session_id).finished_at is None
    finally:
        db.close()


def test_round_with_repeated_emotion_rejected(client):
    player_id = create_player(client).json()["id"]
    session_id = start_session(client, player_id).json()["id"]
    first = {"round_no": 1, "target_emotion": "happy", "chosen_image": "a.png", "child_correct": True}
    repeat = {"round_no": 2, "target_emotion": "happy", "chosen_image": "b.png", "child_correct": False}

    assert client.post(f"/sessions/{session_id}/rounds", json=first).status_code == 201
    res = client.post(f"/sessions/{session_id}/rounds", json=repeat)
    assert res.status_code == 409


# --- point 5: unknown ids return 404 ------------------------------------

def test_start_session_unknown_player_404(client):
    res = start_session(client, "missing-player-id")
    assert res.status_code == 404


def test_save_round_unknown_session_404(client):
    res = client.post(
        "/sessions/missing-session-id/rounds",
        json={"round_no": 1, "target_emotion": "happy", "chosen_image": "a.png", "child_correct": True},
    )
    assert res.status_code == 404


def test_finish_unknown_session_404(client):
    res = client.patch("/sessions/missing-session-id/finish")
    assert res.status_code == 404


def test_get_unknown_player_404(client):
    res = client.get("/players/missing-player-id")
    assert res.status_code == 404

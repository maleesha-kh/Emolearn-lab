import pytest
from sqlalchemy.exc import IntegrityError

from app.db.models import DictionaryProgress

EMOTIONS = ["happy", "sad", "angry", "surprised"]


def create_player(client, nickname="Amara", avatar_id="fox"):
    return client.post("/players", json={"nickname": nickname, "avatar_id": avatar_id}).json()


def complete(client, player_id, emotion):
    res = client.post(f"/players/{player_id}/dictionary/{emotion}/complete")
    assert res.status_code == 200
    return res.json()


def completed_emotions(body):
    return [c["emotion"] for c in body["completed"]]


def play_session(client, player_id):
    session_id = client.post("/sessions", json={"player_id": player_id, "mood_checkin": "happy"}).json()["id"]
    for i, emotion in enumerate(EMOTIONS, start=1):
        res = client.post(
            f"/sessions/{session_id}/rounds",
            json={"round_no": i, "target_emotion": emotion, "chosen_image": f"img{i}.png", "child_correct": True},
        )
        assert res.status_code == 201
    res = client.patch(f"/sessions/{session_id}/finish")
    assert res.status_code == 200
    return res.json()


def test_dictionary_is_empty_at_start(client):
    player_id = create_player(client)["id"]
    res = client.get(f"/players/{player_id}/dictionary")
    assert res.status_code == 200
    assert res.json() == {"completed": []}


def test_complete_one_emotion(client):
    player_id = create_player(client)["id"]
    body = complete(client, player_id, "sad")
    assert completed_emotions(body) == ["sad"]
    assert body["completed"][0]["completed_at"]
    assert body["new_badges"] == []

    listed = client.get(f"/players/{player_id}/dictionary").json()
    assert listed["completed"] == body["completed"]


def test_complete_twice_is_idempotent(db_client):
    client, session_local = db_client
    player_id = create_player(client)["id"]
    first = complete(client, player_id, "happy")
    second = complete(client, player_id, "happy")

    assert second["completed"] == first["completed"]
    assert second["new_badges"] == []
    with session_local() as db:
        assert db.query(DictionaryProgress).filter_by(player_id=player_id).count() == 1


def test_newly_completed_true_only_on_first_call(client):
    player_id = create_player(client)["id"]
    assert complete(client, player_id, "angry")["newly_completed"] is True
    assert complete(client, player_id, "angry")["newly_completed"] is False
    assert complete(client, player_id, "sad")["newly_completed"] is True


def test_completed_list_uses_display_order(client):
    player_id = create_player(client)["id"]
    for emotion in ["surprised", "happy", "angry"]:
        complete(client, player_id, emotion)
    body = client.get(f"/players/{player_id}/dictionary").json()
    assert completed_emotions(body) == ["happy", "angry", "surprised"]


def test_unknown_emotion_returns_422(client):
    player_id = create_player(client)["id"]
    for emotion in ["scared", "Happy"]:
        res = client.post(f"/players/{player_id}/dictionary/{emotion}/complete")
        assert res.status_code == 422
    assert client.get(f"/players/{player_id}/dictionary").json() == {"completed": []}


def test_database_rejects_unknown_emotion(db_client):
    client, session_local = db_client
    player_id = create_player(client)["id"]
    with session_local() as db:
        db.add(DictionaryProgress(player_id=player_id, emotion="scared"))
        with pytest.raises(IntegrityError):
            db.commit()


def test_missing_player_returns_404(client):
    assert client.get("/players/nope/dictionary").status_code == 404
    assert client.post("/players/nope/dictionary/happy/complete").status_code == 404


def test_feelings_explorer_awarded_on_fourth_emotion_only_once(client):
    player_id = create_player(client)["id"]
    for emotion in EMOTIONS[:3]:
        assert complete(client, player_id, emotion)["new_badges"] == []

    assert complete(client, player_id, "surprised")["new_badges"] == ["feelings-explorer"]
    assert complete(client, player_id, "surprised")["new_badges"] == []
    assert "feelings-explorer" not in play_session(client, player_id)["new_badges"]

    badges = [b["badge_id"] for b in client.get(f"/players/{player_id}/badges").json()]
    assert badges.count("feelings-explorer") == 1


def test_session_badges_still_awarded_from_complete_endpoint(client):
    player_id = create_player(client)["id"]
    play_session(client, player_id)
    assert complete(client, player_id, "happy")["new_badges"] == []


def test_delete_player_removes_dictionary_rows(db_client):
    client, session_local = db_client
    player_id = create_player(client)["id"]
    for emotion in EMOTIONS:
        complete(client, player_id, emotion)

    assert client.delete(f"/players/{player_id}").status_code == 204
    with session_local() as db:
        assert db.query(DictionaryProgress).filter_by(player_id=player_id).count() == 0


def test_dashboard_dictionary_completed_count(client):
    player_id = create_player(client)["id"]

    def dashboard_count():
        res = client.get(f"/players/{player_id}/dashboard")
        assert res.status_code == 200
        return res.json()["dictionary_completed"]

    assert dashboard_count() == 0
    complete(client, player_id, "happy")
    complete(client, player_id, "angry")
    assert dashboard_count() == 2
    complete(client, player_id, "sad")
    complete(client, player_id, "surprised")
    complete(client, player_id, "surprised")
    assert dashboard_count() == 4

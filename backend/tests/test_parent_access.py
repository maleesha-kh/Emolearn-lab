"""Which player routes need the parent PIN: the dashboard, CSV report, rename
and delete do; everything a child uses while playing does not."""
import pytest

PIN = "1234"
PARENT = {"X-Parent-Pin": PIN}
WRONG = {"X-Parent-Pin": "0000"}


def create_player(client, nickname="Amara", avatar_id="fox"):
    res = client.post("/players", json={"nickname": nickname, "avatar_id": avatar_id})
    assert res.status_code == 201
    return res.json()["id"]


def setup_pin(client):
    assert client.post("/parent/pin/setup", json={"pin": PIN}).status_code == 201


def parent_request(client, name, player_id, headers=None):
    if name == "dashboard":
        return client.get(f"/players/{player_id}/dashboard", headers=headers)
    if name == "report":
        return client.get(f"/players/{player_id}/report.csv", headers=headers)
    if name == "rename":
        return client.patch(f"/players/{player_id}", json={"nickname": "Nova"}, headers=headers)
    return client.delete(f"/players/{player_id}", headers=headers)


PARENT_ROUTES = ["dashboard", "report", "rename", "delete"]


@pytest.mark.parametrize("name", PARENT_ROUTES)
def test_parent_route_without_pin_gives_401(client, name):
    setup_pin(client)
    player_id = create_player(client)
    res = parent_request(client, name, player_id)
    assert res.status_code == 401
    assert res.json()["detail"] == "Parent PIN required"


@pytest.mark.parametrize("name", PARENT_ROUTES)
def test_parent_route_with_wrong_pin_gives_403(client, name):
    setup_pin(client)
    player_id = create_player(client)
    res = parent_request(client, name, player_id, WRONG)
    assert res.status_code == 403
    assert res.json()["detail"] == "Wrong parent PIN"


@pytest.mark.parametrize("name", PARENT_ROUTES)
def test_parent_route_before_pin_setup_gives_403(client, name):
    player_id = create_player(client)
    res = parent_request(client, name, player_id, PARENT)
    assert res.status_code == 403
    assert res.json()["detail"] == "No parent PIN set yet"


@pytest.mark.parametrize("name", PARENT_ROUTES)
def test_parent_route_with_right_pin_works(client, name):
    setup_pin(client)
    player_id = create_player(client)
    assert parent_request(client, name, player_id, PARENT).status_code in (200, 204)


@pytest.mark.parametrize("headers", [None, WRONG])
def test_rejected_rename_and_delete_change_nothing(client, headers):
    setup_pin(client)
    player_id = create_player(client)
    assert parent_request(client, "rename", player_id, headers).status_code in (401, 403)
    assert parent_request(client, "delete", player_id, headers).status_code in (401, 403)

    res = client.get(f"/players/{player_id}")
    assert res.status_code == 200
    assert res.json()["nickname"] == "Amara"


def test_child_routes_do_not_need_the_pin(client):
    setup_pin(client)
    player_id = create_player(client)

    assert client.get("/players").status_code == 200
    assert client.get(f"/players/{player_id}").status_code == 200
    assert client.get(f"/players/{player_id}/profile").status_code == 200
    assert client.get(f"/players/{player_id}/badges").status_code == 200
    assert client.get(f"/players/{player_id}/sessions").status_code == 200
    assert client.get(f"/players/{player_id}/dictionary").status_code == 200
    assert client.post(f"/players/{player_id}/dictionary/happy/complete").status_code == 200

    session = client.post("/sessions", json={"player_id": player_id, "mood_checkin": "happy"})
    assert session.status_code == 201
    session_id = session.json()["id"]
    for i, emotion in enumerate(["happy", "sad", "angry", "surprised"], start=1):
        res = client.post(f"/sessions/{session_id}/rounds", json={
            "round_no": i, "target_emotion": emotion, "chosen_image": f"img{i}.png", "child_correct": True,
        })
        assert res.status_code == 201
    assert client.patch(f"/sessions/{session_id}/finish").status_code == 200

    diary = client.post(f"/players/{player_id}/diary", json={"emotion": "happy", "intensity": "little", "reason_tags": ["friends"]})
    assert diary.status_code == 201
    assert client.post(f"/players/{player_id}/buddy/ask", json={"question": "why do we cry"}).status_code == 200

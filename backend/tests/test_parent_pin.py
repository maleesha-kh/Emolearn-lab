from app.db.models import Setting

PIN = "1234"
NEW_PIN = "5678"


def test_status_false_at_start(client):
    res = client.get("/parent/pin/status")
    assert res.status_code == 200
    assert res.json() == {"is_set": False}


def test_setup_works_once(client):
    res = client.post("/parent/pin/setup", json={"pin": PIN})
    assert res.status_code == 201
    assert res.json() == {"is_set": True}

    status = client.get("/parent/pin/status").json()
    assert status == {"is_set": True}


def test_second_setup_gives_409(client):
    client.post("/parent/pin/setup", json={"pin": PIN})
    res = client.post("/parent/pin/setup", json={"pin": NEW_PIN})
    assert res.status_code == 409


def test_verify_right_pin(client):
    client.post("/parent/pin/setup", json={"pin": PIN})
    res = client.post("/parent/pin/verify", json={"pin": PIN})
    assert res.status_code == 200
    assert res.json() == {"valid": True}


def test_verify_wrong_pin(client):
    client.post("/parent/pin/setup", json={"pin": PIN})
    res = client.post("/parent/pin/verify", json={"pin": "0000"})
    assert res.status_code == 200
    assert res.json() == {"valid": False}


def test_verify_before_setup_is_false(client):
    res = client.post("/parent/pin/verify", json={"pin": PIN})
    assert res.status_code == 200
    assert res.json() == {"valid": False}


def test_change_with_wrong_current_pin_gives_403(client):
    client.post("/parent/pin/setup", json={"pin": PIN})
    res = client.put("/parent/pin", json={"current_pin": "0000", "new_pin": NEW_PIN})
    assert res.status_code == 403


def test_change_works(client):
    client.post("/parent/pin/setup", json={"pin": PIN})
    res = client.put("/parent/pin", json={"current_pin": PIN, "new_pin": NEW_PIN})
    assert res.status_code == 200
    assert res.json() == {"is_set": True}

    assert client.post("/parent/pin/verify", json={"pin": NEW_PIN}).json() == {"valid": True}
    assert client.post("/parent/pin/verify", json={"pin": PIN}).json() == {"valid": False}


def test_change_before_setup_gives_409(client):
    res = client.put("/parent/pin", json={"current_pin": PIN, "new_pin": NEW_PIN})
    assert res.status_code == 409


def test_non_digit_pin_rejected(client):
    res = client.post("/parent/pin/setup", json={"pin": "12a4"})
    assert res.status_code == 422


def test_wrong_length_pin_rejected(client):
    res = client.post("/parent/pin/setup", json={"pin": "12345"})
    assert res.status_code == 422


def test_database_never_contains_the_plain_pin(db_client):
    client, session_local = db_client
    client.post("/parent/pin/setup", json={"pin": PIN})

    db = session_local()
    try:
        setting = db.get(Setting, "parent_pin_hash")
        assert setting is not None
        assert setting.value != PIN
        assert PIN not in setting.value
        assert "$" in setting.value  # stored as "salt$hash"
    finally:
        db.close()

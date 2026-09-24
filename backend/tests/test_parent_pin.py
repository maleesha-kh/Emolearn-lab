import re
import time

from app.core.security import RECOVERY_ALPHABET
from app.db.models import Setting

PIN = "1234"
NEW_PIN = "5678"

RECOVERY_CODE_PATTERN = re.compile(rf"^[{RECOVERY_ALPHABET}]{{4}}-[{RECOVERY_ALPHABET}]{{4}}-[{RECOVERY_ALPHABET}]{{4}}$")


def test_status_false_at_start(client):
    res = client.get("/parent/pin/status")
    assert res.status_code == 200
    assert res.json() == {"is_set": False, "has_recovery_code": False}


def test_setup_works_once(client):
    res = client.post("/parent/pin/setup", json={"pin": PIN})
    assert res.status_code == 201
    assert "recovery_code" in res.json()

    status = client.get("/parent/pin/status").json()
    assert status == {"is_set": True, "has_recovery_code": True}


def test_setup_returns_recovery_code_in_correct_format(client):
    res = client.post("/parent/pin/setup", json={"pin": PIN})
    code = res.json()["recovery_code"]
    assert RECOVERY_CODE_PATTERN.match(code)


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
    assert res.json() == {"is_set": True, "has_recovery_code": True}

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


# --- recovery ------------------------------------------------------------

def test_recover_with_right_code_works_and_new_pin_verifies(client):
    setup = client.post("/parent/pin/setup", json={"pin": PIN}).json()
    code = setup["recovery_code"]

    res = client.post("/parent/pin/recover", json={"recovery_code": code, "new_pin": NEW_PIN})
    assert res.status_code == 200
    assert "recovery_code" in res.json()

    assert client.post("/parent/pin/verify", json={"pin": NEW_PIN}).json() == {"valid": True}
    assert client.post("/parent/pin/verify", json={"pin": PIN}).json() == {"valid": False}


def test_old_code_stops_working_after_recovery(client):
    setup = client.post("/parent/pin/setup", json={"pin": PIN}).json()
    old_code = setup["recovery_code"]
    client.post("/parent/pin/recover", json={"recovery_code": old_code, "new_pin": NEW_PIN})

    res = client.post("/parent/pin/recover", json={"recovery_code": old_code, "new_pin": "1111"})
    assert res.status_code == 403


def test_recovery_code_works_lowercase_and_without_dashes(client):
    setup = client.post("/parent/pin/setup", json={"pin": PIN}).json()
    mangled = setup["recovery_code"].lower().replace("-", "")

    res = client.post("/parent/pin/recover", json={"recovery_code": mangled, "new_pin": NEW_PIN})
    assert res.status_code == 200
    assert client.post("/parent/pin/verify", json={"pin": NEW_PIN}).json() == {"valid": True}


def test_recover_wrong_code_gives_403(client):
    client.post("/parent/pin/setup", json={"pin": PIN})
    res = client.post("/parent/pin/recover", json={"recovery_code": "ZZZZ-ZZZZ-ZZZZ", "new_pin": NEW_PIN})
    assert res.status_code == 403


def test_recover_before_setup_gives_409(client):
    res = client.post("/parent/pin/recover", json={"recovery_code": "AAAA-AAAA-AAAA", "new_pin": NEW_PIN})
    assert res.status_code == 409


def test_recover_missing_recovery_code_gives_404(db_client):
    client, session_local = db_client
    client.post("/parent/pin/setup", json={"pin": PIN})

    db = session_local()
    try:
        setting = db.get(Setting, "parent_recovery_hash")
        db.delete(setting)
        db.commit()
    finally:
        db.close()

    res = client.post("/parent/pin/recover", json={"recovery_code": "AAAA-AAAA-AAAA", "new_pin": NEW_PIN})
    assert res.status_code == 404


def test_five_wrong_codes_lock_recovery_even_with_right_code(client):
    setup = client.post("/parent/pin/setup", json={"pin": PIN}).json()
    code = setup["recovery_code"]

    for _ in range(5):
        res = client.post("/parent/pin/recover", json={"recovery_code": "0000-0000-0000", "new_pin": NEW_PIN})
        assert res.status_code == 403

    res = client.post("/parent/pin/recover", json={"recovery_code": code, "new_pin": NEW_PIN})
    assert res.status_code == 429
    body = res.json()
    assert body["retry_after_seconds"] > 0
    assert "detail" in body

    # The PIN must not have changed, since the correct code was rejected while locked.
    assert client.post("/parent/pin/verify", json={"pin": PIN}).json() == {"valid": True}


def test_expired_lock_resets_fail_count(db_client):
    client, session_local = db_client
    setup = client.post("/parent/pin/setup", json={"pin": PIN}).json()
    code = setup["recovery_code"]

    for _ in range(5):
        client.post("/parent/pin/recover", json={"recovery_code": "0000-0000-0000", "new_pin": NEW_PIN})

    # Simulate the 15-minute lockout having already expired.
    db = session_local()
    try:
        locked_until = db.get(Setting, "recovery_locked_until")
        assert locked_until is not None
        locked_until.value = str(time.time() - 1)
        db.commit()
    finally:
        db.close()

    # One more wrong code: since the lock had expired, this should be treated
    # as attempt 1 of a fresh 5, not attempt 6 — so it's a plain 403, not 429.
    res = client.post("/parent/pin/recover", json={"recovery_code": "1111-1111-1111", "new_pin": NEW_PIN})
    assert res.status_code == 403

    db = session_local()
    try:
        fail_count = db.get(Setting, "recovery_fail_count")
        assert fail_count is not None
        assert fail_count.value == "1"
        assert db.get(Setting, "recovery_locked_until") is None
    finally:
        db.close()

    # And the real code still works — not blocked by a stale lock.
    res = client.post("/parent/pin/recover", json={"recovery_code": code, "new_pin": NEW_PIN})
    assert res.status_code == 200


# --- regenerate ------------------------------------------------------------

def test_regenerate_wrong_pin_gives_403(client):
    client.post("/parent/pin/setup", json={"pin": PIN})
    res = client.post("/parent/recovery-code/regenerate", json={"pin": "0000"})
    assert res.status_code == 403


def test_regenerate_right_pin_invalidates_old_code(client):
    setup = client.post("/parent/pin/setup", json={"pin": PIN}).json()
    old_code = setup["recovery_code"]

    res = client.post("/parent/recovery-code/regenerate", json={"pin": PIN})
    assert res.status_code == 200
    new_code = res.json()["recovery_code"]
    assert new_code != old_code

    old_res = client.post("/parent/pin/recover", json={"recovery_code": old_code, "new_pin": NEW_PIN})
    assert old_res.status_code == 403

    new_res = client.post("/parent/pin/recover", json={"recovery_code": new_code, "new_pin": NEW_PIN})
    assert new_res.status_code == 200


def test_database_never_contains_the_plain_recovery_code(db_client):
    client, session_local = db_client
    setup = client.post("/parent/pin/setup", json={"pin": PIN}).json()
    code = setup["recovery_code"]
    normalized = code.replace("-", "")

    db = session_local()
    try:
        setting = db.get(Setting, "parent_recovery_hash")
        assert setting is not None
        assert setting.value != code
        assert setting.value != normalized
        assert normalized not in setting.value
        assert "$" in setting.value
    finally:
        db.close()

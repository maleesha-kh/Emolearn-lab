"""Parent PIN routes: set up, verify, change, and recover the parent-gate
PIN using a one-time recovery code.

The PIN and recovery code are never logged or returned as plain text after
the moment they're created; only their salted PBKDF2 hashes are stored, in
the settings table under parent_pin_hash / parent_recovery_hash.
"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.security import generate_recovery_code, hash_pin, normalize_recovery_code, verify_pin
from app.db.database import get_db
from app.db.models import Setting
from app.schemas.parent import (
    PinChange,
    PinRecover,
    PinSetup,
    PinStatusOut,
    PinVerify,
    PinVerifyOut,
    RecoveryCodeOut,
    RecoveryRegenerate,
)

router = APIRouter(tags=["parent"])

PIN_SETTING_KEY = "parent_pin_hash"
RECOVERY_HASH_KEY = "parent_recovery_hash"
RECOVERY_FAIL_COUNT_KEY = "recovery_fail_count"
RECOVERY_LOCKED_UNTIL_KEY = "recovery_locked_until"

MAX_RECOVERY_ATTEMPTS = 5
RECOVERY_LOCKOUT_SECONDS = 15 * 60


def require_parent_pin(
    x_parent_pin: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> None:
    """Dependency for parent-only endpoints; expects the PIN in X-Parent-Pin."""
    if not x_parent_pin:
        raise HTTPException(status_code=401, detail="Parent PIN required")
    if _get_setting(db, PIN_SETTING_KEY) is None:
        raise HTTPException(status_code=403, detail="No parent PIN set yet")
    if not _pin_matches(db, x_parent_pin):
        raise HTTPException(status_code=403, detail="Wrong parent PIN")


@router.get("/parent/pin/status", response_model=PinStatusOut)
def pin_status(db: Session = Depends(get_db)):
    return PinStatusOut(
        is_set=_get_setting(db, PIN_SETTING_KEY) is not None,
        has_recovery_code=_get_setting(db, RECOVERY_HASH_KEY) is not None,
    )


@router.post("/parent/pin/setup", response_model=RecoveryCodeOut, status_code=201)
def pin_setup(payload: PinSetup, db: Session = Depends(get_db)):
    if _get_setting(db, PIN_SETTING_KEY) is not None:
        raise HTTPException(status_code=409, detail="A PIN is already set")

    _set_setting(db, PIN_SETTING_KEY, hash_pin(payload.pin))
    recovery_code = _issue_recovery_code(db)
    db.commit()
    return RecoveryCodeOut(recovery_code=recovery_code)


@router.post("/parent/pin/verify", response_model=PinVerifyOut)
def pin_verify(payload: PinVerify, db: Session = Depends(get_db)):
    return PinVerifyOut(valid=_pin_matches(db, payload.pin))


@router.put("/parent/pin", response_model=PinStatusOut)
def pin_change(payload: PinChange, db: Session = Depends(get_db)):
    setting = db.get(Setting, PIN_SETTING_KEY)
    if setting is None:
        raise HTTPException(status_code=409, detail="No PIN is set yet")

    if not verify_pin(payload.current_pin, setting.value):
        raise HTTPException(status_code=403, detail="Current PIN is incorrect")

    setting.value = hash_pin(payload.new_pin)
    db.commit()
    return PinStatusOut(is_set=True, has_recovery_code=_get_setting(db, RECOVERY_HASH_KEY) is not None)


@router.post("/parent/pin/recover", response_model=RecoveryCodeOut)
def pin_recover(payload: PinRecover, db: Session = Depends(get_db)):
    if _get_setting(db, PIN_SETTING_KEY) is None:
        raise HTTPException(status_code=409, detail="No PIN is set yet")

    recovery_hash = _get_setting(db, RECOVERY_HASH_KEY)
    if recovery_hash is None:
        raise HTTPException(status_code=404, detail="No recovery code exists")

    lock_response = _rejected_if_locked(db)
    if lock_response is not None:
        return lock_response

    if not verify_pin(normalize_recovery_code(payload.recovery_code), recovery_hash):
        _register_recovery_failure(db)
        db.commit()
        raise HTTPException(status_code=403, detail="Recovery code is incorrect")

    _set_setting(db, PIN_SETTING_KEY, hash_pin(payload.new_pin))
    new_code = _issue_recovery_code(db)
    db.commit()
    return RecoveryCodeOut(recovery_code=new_code)


@router.post("/parent/recovery-code/regenerate", response_model=RecoveryCodeOut)
def regenerate_recovery_code(payload: RecoveryRegenerate, db: Session = Depends(get_db)):
    stored = _get_setting(db, PIN_SETTING_KEY)
    if stored is None or not verify_pin(payload.pin, stored):
        raise HTTPException(status_code=403, detail="PIN is incorrect")

    new_code = _issue_recovery_code(db)
    db.commit()
    return RecoveryCodeOut(recovery_code=new_code)


def _pin_matches(db: Session, pin: str) -> bool:
    stored = _get_setting(db, PIN_SETTING_KEY)
    return stored is not None and verify_pin(pin, stored)


def _issue_recovery_code(db: Session) -> str:
    """Generate a fresh recovery code, store only its hash, and clear any
    lockout state. Used on setup, successful recovery, and regenerate."""
    code = generate_recovery_code()
    _set_setting(db, RECOVERY_HASH_KEY, hash_pin(normalize_recovery_code(code)))
    _clear_setting(db, RECOVERY_FAIL_COUNT_KEY)
    _clear_setting(db, RECOVERY_LOCKED_UNTIL_KEY)
    return code


def _rejected_if_locked(db: Session) -> Optional[JSONResponse]:
    locked_until_raw = _get_setting(db, RECOVERY_LOCKED_UNTIL_KEY)
    if locked_until_raw is None:
        return None

    locked_until = float(locked_until_raw)
    now = datetime.now(timezone.utc).timestamp()
    if now < locked_until:
        retry_after = int(locked_until - now) + 1
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many wrong recovery codes. Try again later.", "retry_after_seconds": retry_after},
        )

    # Lock expired — clear it and the failure count, so the next attempt
    # gets a fresh set of tries instead of an instant re-lock.
    _clear_setting(db, RECOVERY_LOCKED_UNTIL_KEY)
    _clear_setting(db, RECOVERY_FAIL_COUNT_KEY)
    db.commit()
    return None


def _register_recovery_failure(db: Session) -> None:
    count = int(_get_setting(db, RECOVERY_FAIL_COUNT_KEY) or "0") + 1
    _set_setting(db, RECOVERY_FAIL_COUNT_KEY, str(count))
    if count >= MAX_RECOVERY_ATTEMPTS:
        until = datetime.now(timezone.utc).timestamp() + RECOVERY_LOCKOUT_SECONDS
        _set_setting(db, RECOVERY_LOCKED_UNTIL_KEY, str(until))


def _get_setting(db: Session, key: str) -> Optional[str]:
    setting = db.get(Setting, key)
    return setting.value if setting is not None else None


def _set_setting(db: Session, key: str, value: str) -> None:
    setting = db.get(Setting, key)
    if setting is None:
        db.add(Setting(key=key, value=value))
    else:
        setting.value = value


def _clear_setting(db: Session, key: str) -> None:
    setting = db.get(Setting, key)
    if setting is not None:
        db.delete(setting)

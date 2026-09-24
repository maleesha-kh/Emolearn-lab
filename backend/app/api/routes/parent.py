"""Parent PIN routes: set up, verify, and change the parent-gate PIN.

The PIN itself is never logged or returned; only its salted PBKDF2 hash is
stored, under settings.key == "parent_pin_hash".
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import hash_pin, verify_pin
from app.db.database import get_db
from app.db.models import Setting
from app.schemas.parent import PinChange, PinSetup, PinStatusOut, PinVerify, PinVerifyOut

router = APIRouter(prefix="/parent/pin", tags=["parent"])

PIN_SETTING_KEY = "parent_pin_hash"


@router.get("/status", response_model=PinStatusOut)
def pin_status(db: Session = Depends(get_db)):
    return PinStatusOut(is_set=_get_setting(db, PIN_SETTING_KEY) is not None)


@router.post("/setup", response_model=PinStatusOut, status_code=201)
def pin_setup(payload: PinSetup, db: Session = Depends(get_db)):
    if _get_setting(db, PIN_SETTING_KEY) is not None:
        raise HTTPException(status_code=409, detail="A PIN is already set")

    db.add(Setting(key=PIN_SETTING_KEY, value=hash_pin(payload.pin)))
    db.commit()
    return PinStatusOut(is_set=True)


@router.post("/verify", response_model=PinVerifyOut)
def pin_verify(payload: PinVerify, db: Session = Depends(get_db)):
    stored = _get_setting(db, PIN_SETTING_KEY)
    valid = stored is not None and verify_pin(payload.pin, stored)
    return PinVerifyOut(valid=valid)


@router.put("", response_model=PinStatusOut)
def pin_change(payload: PinChange, db: Session = Depends(get_db)):
    setting = db.get(Setting, PIN_SETTING_KEY)
    if setting is None:
        raise HTTPException(status_code=409, detail="No PIN is set yet")

    if not verify_pin(payload.current_pin, setting.value):
        raise HTTPException(status_code=403, detail="Current PIN is incorrect")

    setting.value = hash_pin(payload.new_pin)
    db.commit()
    return PinStatusOut(is_set=True)


def _get_setting(db: Session, key: str):
    setting = db.get(Setting, key)
    return setting.value if setting is not None else None

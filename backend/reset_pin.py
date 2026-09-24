"""Delete the saved parent PIN and recovery code, for when a parent forgets
both.

Run from backend/ with the venv active:
    venv\\Scripts\\python.exe reset_pin.py
"""
from app.api.routes.parent import (
    PIN_SETTING_KEY,
    RECOVERY_FAIL_COUNT_KEY,
    RECOVERY_HASH_KEY,
    RECOVERY_LOCKED_UNTIL_KEY,
)
from app.db.database import SessionLocal, init_db
from app.db.models import Setting

KEYS = [PIN_SETTING_KEY, RECOVERY_HASH_KEY, RECOVERY_FAIL_COUNT_KEY, RECOVERY_LOCKED_UNTIL_KEY]


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        removed = False
        for key in KEYS:
            setting = db.get(Setting, key)
            if setting is not None:
                db.delete(setting)
                removed = True
        if not removed:
            print("No PIN or recovery code is currently set.")
            return
        db.commit()
        print("Parent PIN and recovery code have been reset. The next /parent/pin/setup call will set new ones.")
    finally:
        db.close()


if __name__ == "__main__":
    main()

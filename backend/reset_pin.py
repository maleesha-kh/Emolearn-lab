"""Delete the saved parent PIN, for when a parent forgets it.

Run from backend/ with the venv active:
    venv\\Scripts\\python.exe reset_pin.py
"""
from app.api.routes.parent import PIN_SETTING_KEY
from app.db.database import SessionLocal, init_db
from app.db.models import Setting


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        setting = db.get(Setting, PIN_SETTING_KEY)
        if setting is None:
            print("No PIN is currently set.")
            return
        db.delete(setting)
        db.commit()
        print("Parent PIN has been reset. The next /parent/pin/setup call will set a new one.")
    finally:
        db.close()


if __name__ == "__main__":
    main()

"""PIN hashing: PBKDF2-HMAC-SHA256 with a random per-PIN salt."""
import hashlib
import hmac
import re
import secrets

PBKDF2_ITERATIONS = 100_000
SALT_BYTES = 16

# Recovery code alphabet excludes characters easily confused with each
# other (0/O, 1/I/L).
RECOVERY_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
RECOVERY_GROUP_LENGTH = 4
RECOVERY_GROUP_COUNT = 3


def hash_pin(pin: str) -> str:
    salt = secrets.token_hex(SALT_BYTES)
    digest = hashlib.pbkdf2_hmac("sha256", pin.encode("utf-8"), salt.encode("utf-8"), PBKDF2_ITERATIONS)
    return f"{salt}${digest.hex()}"


def verify_pin(pin: str, stored: str) -> bool:
    salt, _, expected_hex = stored.partition("$")
    if not salt or not expected_hex:
        return False
    digest = hashlib.pbkdf2_hmac("sha256", pin.encode("utf-8"), salt.encode("utf-8"), PBKDF2_ITERATIONS)
    return hmac.compare_digest(digest.hex(), expected_hex)


def generate_recovery_code() -> str:
    groups = [
        "".join(secrets.choice(RECOVERY_ALPHABET) for _ in range(RECOVERY_GROUP_LENGTH))
        for _ in range(RECOVERY_GROUP_COUNT)
    ]
    return "-".join(groups)


def normalize_recovery_code(code: str) -> str:
    return re.sub(r"[\s-]", "", code).upper()

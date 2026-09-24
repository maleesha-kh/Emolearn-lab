"""PIN hashing: PBKDF2-HMAC-SHA256 with a random per-PIN salt."""
import hashlib
import hmac
import secrets

PBKDF2_ITERATIONS = 100_000
SALT_BYTES = 16


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

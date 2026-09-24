import re

from pydantic import BaseModel, field_validator

PIN_PATTERN = re.compile(r"^\d{4}$")


def _validate_pin(v: str) -> str:
    if not PIN_PATTERN.match(v):
        raise ValueError("PIN must be exactly 4 digits")
    return v


class PinStatusOut(BaseModel):
    is_set: bool
    has_recovery_code: bool


class PinSetup(BaseModel):
    pin: str

    @field_validator("pin")
    @classmethod
    def check_pin(cls, v: str) -> str:
        return _validate_pin(v)


class PinVerify(BaseModel):
    pin: str

    @field_validator("pin")
    @classmethod
    def check_pin(cls, v: str) -> str:
        return _validate_pin(v)


class PinVerifyOut(BaseModel):
    valid: bool


class PinChange(BaseModel):
    current_pin: str
    new_pin: str

    @field_validator("current_pin", "new_pin")
    @classmethod
    def check_pin(cls, v: str) -> str:
        return _validate_pin(v)


class RecoveryCodeOut(BaseModel):
    recovery_code: str


class PinRecover(BaseModel):
    recovery_code: str
    new_pin: str

    @field_validator("new_pin")
    @classmethod
    def check_new_pin(cls, v: str) -> str:
        return _validate_pin(v)


class RecoveryRegenerate(BaseModel):
    pin: str

    @field_validator("pin")
    @classmethod
    def check_pin(cls, v: str) -> str:
        return _validate_pin(v)

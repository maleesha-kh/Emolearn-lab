from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from app.core.config import EMOTION_CLASSES


class SessionCreate(BaseModel):
    player_id: str
    mood_checkin: Optional[str] = None


class SessionOut(BaseModel):
    id: str
    player_id: str
    mood_checkin: Optional[str]
    started_at: str
    finished_at: Optional[str]
    score: Optional[int]
    stars: Optional[int]


class RoundCreate(BaseModel):
    round_no: int = Field(ge=1, le=4)
    target_emotion: str
    chosen_image: str
    child_correct: bool
    predicted_emotion: Optional[str] = None
    confidence: Optional[float] = None

    @field_validator("target_emotion")
    @classmethod
    def validate_target(cls, v: str) -> str:
        if v not in EMOTION_CLASSES:
            raise ValueError(f"target_emotion must be one of {EMOTION_CLASSES}")
        return v

    @field_validator("predicted_emotion")
    @classmethod
    def validate_predicted(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in EMOTION_CLASSES:
            raise ValueError(f"predicted_emotion must be one of {EMOTION_CLASSES}")
        return v


class RoundOut(BaseModel):
    round_no: int
    target_emotion: str
    chosen_image: str
    child_correct: bool
    predicted_emotion: Optional[str]
    confidence: Optional[float]


class FinishSessionOut(BaseModel):
    session: SessionOut
    new_badges: List[str]

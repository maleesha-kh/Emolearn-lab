from typing import List, Literal, Optional

from pydantic import BaseModel, field_validator, model_validator

NOTE_MAX_LENGTH = 200

Emotion = Literal["happy", "sad", "angry", "surprised"]
Reason = Literal["school", "friends", "family", "playing", "pets", "other"]


class DiaryEntryCreate(BaseModel):
    emotion: Emotion
    intensity: Literal["little", "lot"]
    reason_tags: List[Reason] = []
    note: Optional[str] = None

    @field_validator("reason_tags")
    @classmethod
    def drop_duplicate_tags(cls, v: List[str]) -> List[str]:
        # Keeps the order the child tapped the chips in
        return list(dict.fromkeys(v))

    @field_validator("note")
    @classmethod
    def trim_note(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        if len(v) > NOTE_MAX_LENGTH:
            raise ValueError(f"note must be at most {NOTE_MAX_LENGTH} characters")
        return v or None

    @model_validator(mode="after")
    def require_reason_or_note(self) -> "DiaryEntryCreate":
        if not self.reason_tags and self.note is None:
            raise ValueError("pick at least one reason or write a note")
        return self


class DiaryEntryOut(BaseModel):
    id: int
    player_id: str
    created_at: str
    emotion: str
    reason_tags: List[str]
    note: Optional[str]
    intensity: str
    reason_used: Optional[str]
    reason_source: Optional[str]
    reason_confidence: Optional[float]
    sentiment: Optional[str]
    sentiment_confidence: Optional[float]
    bot_reply: Optional[str]
    concern_flag: bool

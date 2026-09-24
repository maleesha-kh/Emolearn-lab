from typing import Dict, List, Optional

from pydantic import BaseModel, field_validator


class PlayerCreate(BaseModel):
    nickname: str
    avatar_id: str

    @field_validator("nickname")
    @classmethod
    def trim_and_validate(cls, v: str) -> str:
        v = v.strip()
        if not (1 <= len(v) <= 20):
            raise ValueError("nickname must be 1-20 characters")
        return v


class PlayerOut(BaseModel):
    id: str
    nickname: str
    avatar_id: str


class EmotionStat(BaseModel):
    correct: int
    attempts: int


class RoundSummary(BaseModel):
    round_no: int
    target_emotion: str
    child_correct: bool


class SessionSummary(BaseModel):
    id: str
    finished_at: Optional[str]
    score: Optional[int]
    stars: Optional[int]
    rounds: List[RoundSummary]


class BadgeOut(BaseModel):
    badge_id: str
    earned_at: str


class ProfileOut(BaseModel):
    player: PlayerOut
    total_stars: int
    sessions_played: int
    emotion_stats: Dict[str, EmotionStat]
    recent_sessions: List[SessionSummary]
    badges: List[BadgeOut]

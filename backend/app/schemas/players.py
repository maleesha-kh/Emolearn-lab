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


class PlayerUpdate(BaseModel):
    nickname: Optional[str] = None
    avatar_id: Optional[str] = None

    @field_validator("nickname")
    @classmethod
    def trim_and_validate(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
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


class EmotionAccuracy(BaseModel):
    correct: int
    attempts: int
    percent: Optional[float]


class DashboardRoundOut(BaseModel):
    round_no: int
    target_emotion: str
    child_correct: bool
    predicted_emotion: Optional[str]
    confidence: Optional[float]


class DashboardSessionOut(BaseModel):
    id: str
    started_at: str
    finished_at: Optional[str]
    mood_checkin: Optional[str]
    score: Optional[int]
    stars: Optional[int]
    rounds: List[DashboardRoundOut]


class DashboardOut(BaseModel):
    player: PlayerOut
    total_sessions: int
    average_score: Optional[float]
    emotion_accuracy: Dict[str, EmotionAccuracy]
    best_emotion: Optional[str]
    needs_practice: Optional[str]
    all_equal: bool
    badges: List[BadgeOut]
    sessions: List[DashboardSessionOut]
    dictionary_completed: int


class DictionaryEntryOut(BaseModel):
    emotion: str
    completed_at: str


class DictionaryOut(BaseModel):
    completed: List[DictionaryEntryOut]


class DictionaryCompleteOut(DictionaryOut):
    new_badges: List[str]
    newly_completed: bool

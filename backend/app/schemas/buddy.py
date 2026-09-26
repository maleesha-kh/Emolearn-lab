from typing import List

from pydantic import BaseModel, field_validator

QUESTION_MAX_LENGTH = 150


class BuddyAsk(BaseModel):
    question: str

    @field_validator("question")
    @classmethod
    def trim_and_validate(cls, v: str) -> str:
        v = v.strip()
        if not (1 <= len(v) <= QUESTION_MAX_LENGTH):
            raise ValueError(f"question must be 1-{QUESTION_MAX_LENGTH} characters")
        return v


class BuddySuggestion(BaseModel):
    id: str
    question: str


class BuddyAnswerOut(BaseModel):
    answer: str
    suggestions: List[BuddySuggestion]
    related: List[BuddySuggestion]
    remaining_today: int


class BuddyMessageOut(BaseModel):
    question: str
    answer: str
    concern_level: str
    concern_categories: List[str]
    created_at: str

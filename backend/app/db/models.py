"""ORM models: players, game sessions, rounds, badges, dictionary progress,
and the emotion diary."""
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import EMOTION_CLASSES
from app.db.database import Base


def _uuid() -> str:
    return uuid.uuid4().hex


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _one_of(column: str, values, name: str, nullable: bool = False) -> CheckConstraint:
    allowed = f"{column} IN (" + ", ".join(f"'{v}'" for v in values) + ")"
    if nullable:
        allowed = f"{column} IS NULL OR {allowed}"
    return CheckConstraint(allowed, name=name)


class Player(Base):
    __tablename__ = "players"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    nickname: Mapped[str] = mapped_column(String(20), nullable=False)
    avatar_id: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, nullable=False)

    sessions: Mapped[List["GameSession"]] = relationship(back_populates="player")
    badges: Mapped[List["PlayerBadge"]] = relationship(back_populates="player")


class GameSession(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    player_id: Mapped[str] = mapped_column(String, ForeignKey("players.id"), nullable=False)
    mood_checkin: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, nullable=False)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    stars: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    player: Mapped["Player"] = relationship(back_populates="sessions")
    rounds: Mapped[List["Round"]] = relationship(back_populates="session", order_by="Round.round_no")


class Round(Base):
    __tablename__ = "rounds"
    __table_args__ = (UniqueConstraint("session_id", "round_no", name="uq_session_round"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String, ForeignKey("sessions.id"), nullable=False)
    round_no: Mapped[int] = mapped_column(Integer, nullable=False)
    target_emotion: Mapped[str] = mapped_column(String, nullable=False)
    chosen_image: Mapped[str] = mapped_column(String, nullable=False)
    child_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    predicted_emotion: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, nullable=False)

    session: Mapped["GameSession"] = relationship(back_populates="rounds")


class PlayerBadge(Base):
    __tablename__ = "player_badges"
    __table_args__ = (UniqueConstraint("player_id", "badge_id", name="uq_player_badge"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    player_id: Mapped[str] = mapped_column(String, ForeignKey("players.id"), nullable=False)
    badge_id: Mapped[str] = mapped_column(String, nullable=False)
    earned_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, nullable=False)

    player: Mapped["Player"] = relationship(back_populates="badges")


class DictionaryProgress(Base):
    __tablename__ = "dictionary_progress"
    __table_args__ = (
        UniqueConstraint("player_id", "emotion", name="uq_player_dictionary_emotion"),
        CheckConstraint(
            "emotion IN (" + ", ".join(f"'{e}'" for e in EMOTION_CLASSES) + ")",
            name="ck_dictionary_emotion",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    player_id: Mapped[str] = mapped_column(String, ForeignKey("players.id"), nullable=False)
    emotion: Mapped[str] = mapped_column(String, nullable=False)
    completed_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, nullable=False)


DIARY_REASONS = ["school", "friends", "family", "playing", "pets", "other"]
DIARY_INTENSITIES = ["little", "lot"]
DIARY_REASON_SOURCES = ["chip", "model", "default"]
DIARY_SENTIMENTS = ["positive", "negative"]
PARENT_TIP_SOURCES = ["tip_bank", "concern"]


class DiaryEntry(Base):
    __tablename__ = "diary_entries"
    __table_args__ = (
        _one_of("emotion", EMOTION_CLASSES, "ck_diary_emotion"),
        _one_of("intensity", DIARY_INTENSITIES, "ck_diary_intensity"),
        _one_of("reason_used", DIARY_REASONS, "ck_diary_reason_used", nullable=True),
        _one_of("reason_source", DIARY_REASON_SOURCES, "ck_diary_reason_source", nullable=True),
        _one_of("sentiment", DIARY_SENTIMENTS, "ck_diary_sentiment", nullable=True),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    player_id: Mapped[str] = mapped_column(
        String, ForeignKey("players.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, nullable=False)
    emotion: Mapped[str] = mapped_column(String, nullable=False)
    reason_tags: Mapped[List[str]] = mapped_column(JSON, nullable=False, default=list)
    note: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    intensity: Mapped[str] = mapped_column(String, nullable=False)
    reason_used: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    reason_source: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    reason_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sentiment: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    sentiment_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    bot_reply: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    concern_flag: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    parent_tip: Mapped[Optional["ParentTip"]] = relationship(back_populates="diary_entry", cascade="all, delete-orphan")


class ParentTip(Base):
    __tablename__ = "parent_tips"
    __table_args__ = (_one_of("source", PARENT_TIP_SOURCES, "ck_parent_tip_source"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    diary_entry_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("diary_entries.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    tips: Mapped[List[str]] = mapped_column(JSON, nullable=False, default=list)
    talk_starter: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, nullable=False)

    diary_entry: Mapped["DiaryEntry"] = relationship(back_populates="parent_tip")


class Setting(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String, primary_key=True)
    value: Mapped[str] = mapped_column(String, nullable=False)

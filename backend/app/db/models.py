"""ORM models: players, game sessions, rounds, badges, and dictionary progress."""
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import Boolean, CheckConstraint, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import EMOTION_CLASSES
from app.db.database import Base


def _uuid() -> str:
    return uuid.uuid4().hex


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


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


class Setting(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String, primary_key=True)
    value: Mapped[str] = mapped_column(String, nullable=False)

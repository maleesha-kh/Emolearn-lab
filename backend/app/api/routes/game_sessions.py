"""Game session routes: start a session, save rounds, and finish it."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db, to_utc_iso
from app.db.models import GameSession, Player, Round
from app.schemas.sessions import RoundCreate, RoundOut, SessionCreate, SessionOut

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=SessionOut, status_code=201)
def start_session(payload: SessionCreate, db: Session = Depends(get_db)):
    player = db.get(Player, payload.player_id)
    if player is None:
        raise HTTPException(status_code=404, detail="Player not found")

    session = GameSession(player_id=payload.player_id, mood_checkin=payload.mood_checkin)
    db.add(session)
    db.commit()
    db.refresh(session)
    return _session_out(session)


@router.post("/{session_id}/rounds", response_model=RoundOut, status_code=201)
def save_round(session_id: str, payload: RoundCreate, db: Session = Depends(get_db)):
    session = db.get(GameSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.finished_at is not None:
        raise HTTPException(status_code=409, detail="Session is already finished")

    existing = (
        db.query(Round)
        .filter(Round.session_id == session_id, Round.round_no == payload.round_no)
        .first()
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail=f"Round {payload.round_no} was already saved")

    round_ = Round(
        session_id=session_id,
        round_no=payload.round_no,
        target_emotion=payload.target_emotion,
        chosen_image=payload.chosen_image,
        child_correct=payload.child_correct,
        predicted_emotion=payload.predicted_emotion,
        confidence=payload.confidence,
    )
    db.add(round_)
    db.commit()
    db.refresh(round_)
    return RoundOut(
        round_no=round_.round_no,
        target_emotion=round_.target_emotion,
        chosen_image=round_.chosen_image,
        child_correct=round_.child_correct,
        predicted_emotion=round_.predicted_emotion,
        confidence=round_.confidence,
    )


@router.patch("/{session_id}/finish", response_model=SessionOut)
def finish_session(session_id: str, db: Session = Depends(get_db)):
    session = db.get(GameSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.finished_at is not None:
        return _session_out(session)

    correct_count = (
        db.query(Round)
        .filter(Round.session_id == session_id, Round.child_correct.is_(True))
        .count()
    )
    session.score = correct_count
    session.stars = correct_count
    session.finished_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)
    return _session_out(session)


def _session_out(session: GameSession) -> SessionOut:
    return SessionOut(
        id=session.id,
        player_id=session.player_id,
        mood_checkin=session.mood_checkin,
        started_at=to_utc_iso(session.started_at),
        finished_at=to_utc_iso(session.finished_at),
        score=session.score,
        stars=session.stars,
    )

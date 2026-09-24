"""Player routes: registration, lookup, and the achievements/profile summary."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import EMOTION_CLASSES
from app.db.database import get_db, to_utc_iso
from app.db.models import GameSession, Player, Round
from app.schemas.players import EmotionStat, PlayerCreate, PlayerOut, ProfileOut, RoundSummary, SessionSummary

router = APIRouter(prefix="/players", tags=["players"])


@router.get("", response_model=List[PlayerOut])
def list_players(db: Session = Depends(get_db)):
    players = db.query(Player).order_by(Player.created_at.desc()).all()
    return [PlayerOut(id=p.id, nickname=p.nickname, avatar_id=p.avatar_id) for p in players]


@router.post("", response_model=PlayerOut, status_code=201)
def create_player(payload: PlayerCreate, db: Session = Depends(get_db)):
    existing = (
        db.query(Player)
        .filter(func.lower(Player.nickname) == payload.nickname.lower(), Player.avatar_id == payload.avatar_id)
        .first()
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail="A player with this nickname and avatar already exists")

    player = Player(nickname=payload.nickname, avatar_id=payload.avatar_id)
    db.add(player)
    db.commit()
    db.refresh(player)
    return PlayerOut(id=player.id, nickname=player.nickname, avatar_id=player.avatar_id)


@router.get("/{player_id}", response_model=PlayerOut)
def get_player(player_id: str, db: Session = Depends(get_db)):
    player = db.get(Player, player_id)
    if player is None:
        raise HTTPException(status_code=404, detail="Player not found")
    return PlayerOut(id=player.id, nickname=player.nickname, avatar_id=player.avatar_id)


@router.get("/{player_id}/profile", response_model=ProfileOut)
def get_profile(player_id: str, db: Session = Depends(get_db)):
    player = db.get(Player, player_id)
    if player is None:
        raise HTTPException(status_code=404, detail="Player not found")

    finished_sessions = _finished_sessions(db, player_id)

    total_stars = sum(s.stars or 0 for s in finished_sessions)
    emotion_stats = {e: EmotionStat(correct=0, attempts=0) for e in EMOTION_CLASSES}
    if finished_sessions:
        session_ids = [s.id for s in finished_sessions]
        rounds = db.query(Round).filter(Round.session_id.in_(session_ids)).all()
        for r in rounds:
            stat = emotion_stats[r.target_emotion]
            stat.attempts += 1
            if r.child_correct:
                stat.correct += 1

    return ProfileOut(
        player=PlayerOut(id=player.id, nickname=player.nickname, avatar_id=player.avatar_id),
        total_stars=total_stars,
        sessions_played=len(finished_sessions),
        emotion_stats=emotion_stats,
        recent_sessions=[_session_summary(s) for s in finished_sessions[:5]],
    )


@router.get("/{player_id}/sessions", response_model=List[SessionSummary])
def get_sessions(player_id: str, db: Session = Depends(get_db)):
    player = db.get(Player, player_id)
    if player is None:
        raise HTTPException(status_code=404, detail="Player not found")

    return [_session_summary(s) for s in _finished_sessions(db, player_id)]


def _finished_sessions(db: Session, player_id: str) -> List[GameSession]:
    return (
        db.query(GameSession)
        .filter(GameSession.player_id == player_id, GameSession.finished_at.isnot(None))
        .order_by(GameSession.finished_at.desc())
        .all()
    )


def _session_summary(session: GameSession) -> SessionSummary:
    rounds = sorted(session.rounds, key=lambda r: r.round_no)
    return SessionSummary(
        id=session.id,
        finished_at=to_utc_iso(session.finished_at),
        score=session.score,
        stars=session.stars,
        rounds=[
            RoundSummary(round_no=r.round_no, target_emotion=r.target_emotion, child_correct=r.child_correct)
            for r in rounds
        ],
    )

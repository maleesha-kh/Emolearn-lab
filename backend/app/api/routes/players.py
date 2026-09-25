"""Player routes: registration, lookup, the achievements/profile summary,
the parent dashboard, and the CSV report."""
import csv
import io
import re
from datetime import datetime, timezone
from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.badge_awards import award_new_badges
from app.core.config import EMOTION_CLASSES
from app.db.database import get_db, to_utc_iso
from app.db.models import DiaryEntry, DictionaryProgress, GameSession, ParentTip, Player, PlayerBadge, Round
from app.schemas.players import (
    BadgeOut,
    DashboardOut,
    DashboardRoundOut,
    DashboardSessionOut,
    DictionaryCompleteOut,
    DictionaryEntryOut,
    DictionaryOut,
    EmotionAccuracy,
    EmotionStat,
    PlayerCreate,
    PlayerOut,
    PlayerUpdate,
    ProfileOut,
    RoundSummary,
    SessionSummary,
)

router = APIRouter(prefix="/players", tags=["players"])

# Fixed display/tie-break order (not EMOTION_CLASSES' alphabetical order) —
# matches the order already used for the emo-explorer badge check.
EMOTION_ORDER = ["happy", "sad", "angry", "surprised"]

CSV_INJECTION_PREFIXES = ("=", "+", "-", "@")


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


@router.patch("/{player_id}", response_model=PlayerOut)
def update_player(player_id: str, payload: PlayerUpdate, db: Session = Depends(get_db)):
    player = db.get(Player, player_id)
    if player is None:
        raise HTTPException(status_code=404, detail="Player not found")

    new_nickname = payload.nickname if payload.nickname is not None else player.nickname
    new_avatar_id = payload.avatar_id if payload.avatar_id is not None else player.avatar_id

    existing = (
        db.query(Player)
        .filter(
            Player.id != player_id,
            func.lower(Player.nickname) == new_nickname.lower(),
            Player.avatar_id == new_avatar_id,
        )
        .first()
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail="A player with this nickname and avatar already exists")

    player.nickname = new_nickname
    player.avatar_id = new_avatar_id
    db.commit()
    return PlayerOut(id=player.id, nickname=player.nickname, avatar_id=player.avatar_id)


@router.delete("/{player_id}", status_code=204)
def delete_player(player_id: str, db: Session = Depends(get_db)):
    player = db.get(Player, player_id)
    if player is None:
        raise HTTPException(status_code=404, detail="Player not found")

    # Everything below runs as one transaction: nothing is committed until
    # every delete has succeeded, and any failure rolls the whole thing back
    # so the player is never left half-deleted.
    try:
        session_ids = [s.id for s in db.query(GameSession).filter(GameSession.player_id == player_id).all()]
        if session_ids:
            db.query(Round).filter(Round.session_id.in_(session_ids)).delete(synchronize_session=False)
            db.query(GameSession).filter(GameSession.player_id == player_id).delete(synchronize_session=False)
        db.query(PlayerBadge).filter(PlayerBadge.player_id == player_id).delete(synchronize_session=False)
        db.query(DictionaryProgress).filter(DictionaryProgress.player_id == player_id).delete(synchronize_session=False)
        diary_ids = select(DiaryEntry.id).where(DiaryEntry.player_id == player_id)
        db.query(ParentTip).filter(ParentTip.diary_entry_id.in_(diary_ids)).delete(synchronize_session=False)
        db.query(DiaryEntry).filter(DiaryEntry.player_id == player_id).delete(synchronize_session=False)
        db.delete(player)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return None


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
        badges=_badges_out(db, player_id),
    )


@router.get("/{player_id}/sessions", response_model=List[SessionSummary])
def get_sessions(player_id: str, db: Session = Depends(get_db)):
    player = db.get(Player, player_id)
    if player is None:
        raise HTTPException(status_code=404, detail="Player not found")

    return [_session_summary(s) for s in _finished_sessions(db, player_id)]


@router.get("/{player_id}/badges", response_model=List[BadgeOut])
def get_badges(player_id: str, db: Session = Depends(get_db)):
    player = db.get(Player, player_id)
    if player is None:
        raise HTTPException(status_code=404, detail="Player not found")

    return _badges_out(db, player_id)


@router.get("/{player_id}/dictionary", response_model=DictionaryOut)
def get_dictionary(player_id: str, db: Session = Depends(get_db)):
    if db.get(Player, player_id) is None:
        raise HTTPException(status_code=404, detail="Player not found")

    return DictionaryOut(completed=_dictionary_out(db, player_id))


@router.post("/{player_id}/dictionary/{emotion}/complete", response_model=DictionaryCompleteOut)
def complete_dictionary_emotion(player_id: str, emotion: str, db: Session = Depends(get_db)):
    if emotion not in EMOTION_CLASSES:
        raise HTTPException(status_code=422, detail=f"Unknown emotion, expected one of {EMOTION_ORDER}")
    if db.get(Player, player_id) is None:
        raise HTTPException(status_code=404, detail="Player not found")

    already_done = (
        db.query(DictionaryProgress)
        .filter(DictionaryProgress.player_id == player_id, DictionaryProgress.emotion == emotion)
        .first()
    )
    newly_completed = False
    if already_done is None:
        db.add(DictionaryProgress(player_id=player_id, emotion=emotion))
        try:
            db.commit()
            newly_completed = True
        except IntegrityError:
            # A parallel request completed the same emotion first
            db.rollback()

    new_badges = award_new_badges(db, player_id)
    return DictionaryCompleteOut(
        completed=_dictionary_out(db, player_id),
        new_badges=new_badges,
        newly_completed=newly_completed,
    )


@router.get("/{player_id}/dashboard", response_model=DashboardOut)
def get_dashboard(player_id: str, db: Session = Depends(get_db)):
    player = db.get(Player, player_id)
    if player is None:
        raise HTTPException(status_code=404, detail="Player not found")

    finished_sessions = _finished_sessions(db, player_id)  # newest first

    total_sessions = len(finished_sessions)
    average_score = round(sum(s.score or 0 for s in finished_sessions) / total_sessions, 1) if finished_sessions else None

    counts = {e: {"correct": 0, "attempts": 0} for e in EMOTION_ORDER}
    if finished_sessions:
        session_ids = [s.id for s in finished_sessions]
        rounds = db.query(Round).filter(Round.session_id.in_(session_ids)).all()
        for r in rounds:
            if r.target_emotion in counts:
                counts[r.target_emotion]["attempts"] += 1
                if r.child_correct:
                    counts[r.target_emotion]["correct"] += 1

    emotion_accuracy: Dict[str, EmotionAccuracy] = {}
    percents: Dict[str, float] = {}
    for e in EMOTION_ORDER:
        correct = counts[e]["correct"]
        attempts = counts[e]["attempts"]
        percent = round(correct / attempts * 100, 1) if attempts > 0 else None
        emotion_accuracy[e] = EmotionAccuracy(correct=correct, attempts=attempts, percent=percent)
        if percent is not None:
            percents[e] = percent

    best_emotion, needs_practice, all_equal = _best_and_needs_practice(percents)

    return DashboardOut(
        player=PlayerOut(id=player.id, nickname=player.nickname, avatar_id=player.avatar_id),
        total_sessions=total_sessions,
        average_score=average_score,
        emotion_accuracy=emotion_accuracy,
        best_emotion=best_emotion,
        needs_practice=needs_practice,
        all_equal=all_equal,
        badges=_badges_out(db, player_id),
        sessions=[_dashboard_session_out(s) for s in finished_sessions],
        dictionary_completed=db.query(DictionaryProgress).filter(DictionaryProgress.player_id == player_id).count(),
    )


@router.get("/{player_id}/report.csv")
def get_report_csv(player_id: str, db: Session = Depends(get_db)):
    player = db.get(Player, player_id)
    if player is None:
        raise HTTPException(status_code=404, detail="Player not found")

    finished_sessions = (
        db.query(GameSession)
        .filter(GameSession.player_id == player_id, GameSession.finished_at.isnot(None))
        .order_by(GameSession.finished_at.asc())
        .all()
    )

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Date", "Time", "Mood", "Score", "Stars", "Happy", "Sad", "Angry", "Surprised"])

    for session in finished_sessions:
        local_dt = _to_local(session.finished_at)
        by_emotion = {r.target_emotion: r for r in session.rounds}

        row = [
            local_dt.strftime("%Y-%m-%d"),
            local_dt.strftime("%H:%M"),
            _csv_safe(session.mood_checkin or "-"),
            session.score,
            session.stars,
        ]
        for emotion in EMOTION_ORDER:
            r = by_emotion.get(emotion)
            row.append("-" if r is None else ("Correct" if r.child_correct else "Wrong"))
        writer.writerow(row)

    csv_bytes = buffer.getvalue().encode("utf-8-sig")

    safe_nickname = re.sub(r"[^A-Za-z0-9_-]", "", player.nickname) or "player"
    filename = f"emolearn_{safe_nickname}_{datetime.now().strftime('%Y-%m-%d')}.csv"

    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _best_and_needs_practice(percents: Dict[str, float]):
    tried = [e for e in EMOTION_ORDER if e in percents]

    if len(tried) == 0:
        return None, None, False

    if len(tried) == 1:
        return tried[0], None, False

    if len({percents[e] for e in tried}) == 1:
        return None, None, True

    # max()/min() keep the first element on a tie when scanning left to
    # right, so iterating EMOTION_ORDER gives exactly the requested
    # happy/sad/angry/surprised tie-break.
    best = max(tried, key=lambda e: percents[e])
    worst = min(tried, key=lambda e: percents[e])
    return best, worst, False


def _to_local(dt: datetime) -> datetime:
    # SQLite returns naive datetimes that are really UTC; astimezone() on a
    # naive value would treat it as local time instead of converting it, so
    # UTC must be attached explicitly first.
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone()


def _csv_safe(value: str) -> str:
    if value != "-" and value.startswith(CSV_INJECTION_PREFIXES):
        return "'" + value
    return value


def _badges_out(db: Session, player_id: str) -> List[BadgeOut]:
    badges = (
        db.query(PlayerBadge)
        .filter(PlayerBadge.player_id == player_id)
        .order_by(PlayerBadge.earned_at.asc())
        .all()
    )
    return [BadgeOut(badge_id=b.badge_id, earned_at=to_utc_iso(b.earned_at)) for b in badges]


def _dictionary_out(db: Session, player_id: str) -> List[DictionaryEntryOut]:
    rows = db.query(DictionaryProgress).filter(DictionaryProgress.player_id == player_id).all()
    rows.sort(key=lambda p: EMOTION_ORDER.index(p.emotion))
    return [DictionaryEntryOut(emotion=p.emotion, completed_at=to_utc_iso(p.completed_at)) for p in rows]


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


def _dashboard_session_out(session: GameSession) -> DashboardSessionOut:
    rounds = sorted(session.rounds, key=lambda r: r.round_no)
    return DashboardSessionOut(
        id=session.id,
        started_at=to_utc_iso(session.started_at),
        finished_at=to_utc_iso(session.finished_at),
        mood_checkin=session.mood_checkin,
        score=session.score,
        stars=session.stars,
        rounds=[
            DashboardRoundOut(
                round_no=r.round_no,
                target_emotion=r.target_emotion,
                child_correct=r.child_correct,
                predicted_emotion=r.predicted_emotion,
                confidence=r.confidence,
            )
            for r in rounds
        ],
    )

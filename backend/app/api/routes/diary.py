"""Emotion diary routes: the child writes entries, a parent (PIN) reads and
deletes them."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.routes.parent import require_parent_pin
from app.db.database import get_db, to_utc_iso
from app.db.models import DiaryEntry, Player
from app.schemas.diary import DiaryEntryCreate, DiaryEntryOut
from app.services.safety import CONCERN_REPLY, check_concern

router = APIRouter(prefix="/players", tags=["diary"])


@router.post("/{player_id}/diary", response_model=DiaryEntryOut, status_code=201)
def create_diary_entry(player_id: str, payload: DiaryEntryCreate, db: Session = Depends(get_db)):
    _get_player_or_404(db, player_id)

    level, categories = check_concern(payload.note or "")
    high = level == "high"
    entry = DiaryEntry(
        player_id=player_id,
        emotion=payload.emotion,
        intensity=payload.intensity,
        reason_tags=payload.reason_tags,
        note=payload.note,
        concern_flag=high,
        concern_level=level,
        concern_categories=categories,
        # Other replies, including watch-level ones, are filled in by a later phase
        bot_reply=CONCERN_REPLY if high else None,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _entry_out(entry)


@router.get(
    "/{player_id}/diary",
    response_model=List[DiaryEntryOut],
    dependencies=[Depends(require_parent_pin)],
)
def list_diary_entries(
    player_id: str,
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    _get_player_or_404(db, player_id)

    entries = (
        db.query(DiaryEntry)
        .filter(DiaryEntry.player_id == player_id)
        .order_by(DiaryEntry.created_at.desc(), DiaryEntry.id.desc())
        .limit(limit)
        .all()
    )
    return [_entry_out(e) for e in entries]


@router.delete(
    "/{player_id}/diary/{entry_id}",
    status_code=204,
    dependencies=[Depends(require_parent_pin)],
)
def delete_diary_entry(player_id: str, entry_id: int, db: Session = Depends(get_db)):
    _get_player_or_404(db, player_id)

    entry = db.get(DiaryEntry, entry_id)
    if entry is None or entry.player_id != player_id:
        raise HTTPException(status_code=404, detail="Diary entry not found")

    db.delete(entry)
    db.commit()
    return None


def _get_player_or_404(db: Session, player_id: str) -> Player:
    player = db.get(Player, player_id)
    if player is None:
        raise HTTPException(status_code=404, detail="Player not found")
    return player


def _entry_out(entry: DiaryEntry) -> DiaryEntryOut:
    return DiaryEntryOut(
        id=entry.id,
        player_id=entry.player_id,
        created_at=to_utc_iso(entry.created_at),
        emotion=entry.emotion,
        reason_tags=entry.reason_tags,
        note=entry.note,
        intensity=entry.intensity,
        reason_used=entry.reason_used,
        reason_source=entry.reason_source,
        reason_confidence=entry.reason_confidence,
        sentiment=entry.sentiment,
        sentiment_confidence=entry.sentiment_confidence,
        bot_reply=entry.bot_reply,
        concern_flag=entry.concern_flag,
        concern_level=entry.concern_level,
        concern_categories=entry.concern_categories,
    )

"""Emotion diary routes: the child writes entries and gets a reply, a parent
(PIN) reads, deletes and gets tips for them."""
from typing import List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.routes.parent import require_parent_pin
from app.data.tip_bank import (
    CONCERN_RESPONSE,
    WATCH_NOTE,
    get_entry,
    intensity_note,
    pick_child_reply,
)
from app.db.database import get_db, to_utc_iso
from app.db.models import DiaryEntry, ParentTip, Player
from app.schemas.diary import DiaryEntryCreate, DiaryEntryOut, ParentTipOut
from app.services import diary_ml
from app.services.safety import check_concern

# Used when there is no note to run the sentiment model on
EMOTION_SENTIMENT = {"happy": "positive", "sad": "negative", "angry": "negative", "surprised": None}

router = APIRouter(prefix="/players", tags=["diary"])


@router.post("/{player_id}/diary", response_model=DiaryEntryOut, status_code=201)
def create_diary_entry(player_id: str, payload: DiaryEntryCreate, db: Session = Depends(get_db)):
    _get_player_or_404(db, player_id)

    level, categories = check_concern(payload.note or "")
    entry = DiaryEntry(
        player_id=player_id,
        emotion=payload.emotion,
        intensity=payload.intensity,
        reason_tags=payload.reason_tags,
        note=payload.note,
        concern_flag=level == "high",
        concern_level=level,
        concern_categories=categories,
    )
    if level == "high":
        # A high concern gets the fixed safety reply; the model and tip bank are skipped
        entry.bot_reply = CONCERN_RESPONSE["child"]
    else:
        prediction = diary_ml.classify(payload.note) if payload.note else None
        entry.reason_used, entry.reason_source, entry.reason_confidence = _choose_reason(
            payload.reason_tags, prediction
        )
        if prediction is not None:
            entry.sentiment = prediction["sentiment"]
            entry.sentiment_confidence = prediction["sentiment_confidence"]
        else:
            entry.sentiment = EMOTION_SENTIMENT[payload.emotion]
        entry.bot_reply = pick_child_reply(get_entry(entry.emotion, entry.reason_used, entry.sentiment))
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


@router.post(
    "/{player_id}/diary/{entry_id}/tips",
    response_model=ParentTipOut,
    dependencies=[Depends(require_parent_pin)],
)
def get_parent_tips(player_id: str, entry_id: int, db: Session = Depends(get_db)):
    _get_player_or_404(db, player_id)
    entry = db.get(DiaryEntry, entry_id)
    if entry is None or entry.player_id != player_id:
        raise HTTPException(status_code=404, detail="Diary entry not found")

    if entry.parent_tip is None:
        if entry.concern_level == "high":
            tip = ParentTip(
                summary=CONCERN_RESPONSE["parent_summary"],
                tips=list(CONCERN_RESPONSE["tips"]),
                talk_starter=CONCERN_RESPONSE["talk_starter"],
                source="concern",
            )
        else:
            bank = get_entry(entry.emotion, entry.reason_used, entry.sentiment)
            notes = [bank["parent_summary"], intensity_note(entry.intensity)]
            if entry.concern_level == "watch":
                notes.append(WATCH_NOTE)
            tip = ParentTip(
                summary=" ".join(n for n in notes if n),
                tips=list(bank["tips"]),
                talk_starter=bank["talk_starter"],
                source="tip_bank",
            )
        entry.parent_tip = tip
        try:
            db.commit()
        except IntegrityError:
            # A parallel request saved the tips first
            db.rollback()
            db.refresh(entry)

    return _tip_out(entry.parent_tip, entry)


def _choose_reason(
    reason_tags: List[str], prediction: Optional[dict]
) -> Tuple[str, str, Optional[float]]:
    if reason_tags and reason_tags[0] != "other":
        return reason_tags[0], "chip", None
    if prediction is not None and prediction["reason_confidence"] is not None:
        return prediction["reason"], "model", prediction["reason_confidence"]
    return "other", "default", None


def _tip_out(tip: ParentTip, entry: DiaryEntry) -> ParentTipOut:
    return ParentTipOut(
        diary_entry_id=entry.id,
        summary=tip.summary,
        tips=tip.tips,
        talk_starter=tip.talk_starter,
        source=tip.source,
        concern_level=entry.concern_level,
        created_at=to_utc_iso(tip.created_at),
    )


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

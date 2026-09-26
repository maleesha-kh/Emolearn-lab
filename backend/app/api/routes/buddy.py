"""Ask Emo routes: a child asks a feelings question and gets an FAQ answer;
a parent (PIN) can read the questions."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.routes.parent import require_parent_pin
from app.core.local_time import local_day_bounds_utc, utc_now
from app.db.database import get_db, to_utc_iso
from app.db.models import BuddyMessage, Player
from app.schemas.buddy import BuddyAnswerOut, BuddyAsk, BuddyMessageOut, BuddySuggestion
from app.services import buddy
from app.services.safety import CONCERN_REPLY, check_concern

router = APIRouter(prefix="/players", tags=["buddy"])


@router.post("/{player_id}/buddy/ask", response_model=BuddyAnswerOut)
def ask(player_id: str, payload: BuddyAsk, db: Session = Depends(get_db)):
    _get_player_or_404(db, player_id)
    used = _questions_used_today(db, player_id)

    # Checked before the daily limit, so a child in danger is never told to come back tomorrow
    level, categories = check_concern(payload.question)
    if level == "high":
        _save(db, player_id, payload.question, CONCERN_REPLY, None, None, level, categories)
        return BuddyAnswerOut(answer=CONCERN_REPLY, suggestions=[], related=[], remaining_today=_remaining(used))

    if used >= buddy.DAILY_LIMIT:
        return BuddyAnswerOut(answer=buddy.RESTING_REPLY, suggestions=[], related=[], remaining_today=0)

    item, score = buddy.match(payload.question)
    if item is not None:
        answer, suggestions = item["answer"], []
        related = [_link(r) for r in buddy.related(payload.question, item["id"])]
    else:
        answer, related = buddy.NO_MATCH_REPLY, []
        suggestions = [_link(s) for s in buddy.suggestions(3)]
    _save(db, player_id, payload.question, answer, item["id"] if item else None, score, level, categories)
    return BuddyAnswerOut(
        answer=answer, suggestions=suggestions, related=related, remaining_today=_remaining(used + 1)
    )


@router.get(
    "/{player_id}/buddy/messages",
    response_model=List[BuddyMessageOut],
    dependencies=[Depends(require_parent_pin)],
)
def list_messages(
    player_id: str,
    limit: int = Query(default=30, ge=1, le=200),
    db: Session = Depends(get_db),
):
    _get_player_or_404(db, player_id)
    messages = (
        db.query(BuddyMessage)
        .filter(BuddyMessage.player_id == player_id)
        .order_by(BuddyMessage.created_at.desc(), BuddyMessage.id.desc())
        .limit(limit)
        .all()
    )
    return [
        BuddyMessageOut(
            question=m.question,
            answer=m.answer,
            concern_level=m.concern_level,
            concern_categories=m.concern_categories,
            created_at=to_utc_iso(m.created_at),
        )
        for m in messages
    ]


def _questions_used_today(db: Session, player_id: str) -> int:
    start, end = local_day_bounds_utc(utc_now())
    return (
        db.query(BuddyMessage)
        .filter(
            BuddyMessage.player_id == player_id,
            BuddyMessage.concern_level != "high",
            BuddyMessage.created_at >= start,
            BuddyMessage.created_at < end,
        )
        .count()
    )


def _link(item) -> BuddySuggestion:
    return BuddySuggestion(id=item["id"], question=item["question"])


def _remaining(used: int) -> int:
    return max(0, buddy.DAILY_LIMIT - used)


def _save(db, player_id, question, answer, matched_id, score, level, categories) -> None:
    db.add(BuddyMessage(
        player_id=player_id,
        question=question,
        answer=answer,
        matched_id=matched_id,
        score=score,
        concern_level=level,
        concern_categories=categories,
        created_at=utc_now(),
    ))
    db.commit()


def _get_player_or_404(db: Session, player_id: str) -> Player:
    player = db.get(Player, player_id)
    if player is None:
        raise HTTPException(status_code=404, detail="Player not found")
    return player

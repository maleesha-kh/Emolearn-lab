"""Stores newly earned badges for a player. Shared by every route that can
earn one, so a badge is never awarded twice."""
from typing import List

from sqlalchemy.orm import Session

from app.core.badges import BADGE_IDS, evaluate_earned_badges
from app.db.models import DictionaryProgress, GameSession, PlayerBadge


def award_new_badges(db: Session, player_id: str) -> List[str]:
    finished_sessions = (
        db.query(GameSession)
        .filter(GameSession.player_id == player_id, GameSession.finished_at.isnot(None))
        .all()
    )
    dictionary_emotions = [
        p.emotion for p in db.query(DictionaryProgress).filter(DictionaryProgress.player_id == player_id).all()
    ]
    earned_now = evaluate_earned_badges(finished_sessions, dictionary_emotions)

    already_earned = {
        b.badge_id for b in db.query(PlayerBadge).filter(PlayerBadge.player_id == player_id).all()
    }
    new_ids = sorted(earned_now - already_earned, key=BADGE_IDS.index)

    for badge_id in new_ids:
        db.add(PlayerBadge(player_id=player_id, badge_id=badge_id))
    if new_ids:
        db.commit()

    return new_ids

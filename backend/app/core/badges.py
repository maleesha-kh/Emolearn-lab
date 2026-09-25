"""Badge ids and the rules that award them, evaluated from finished sessions
(using rounds.child_correct, never the model's own prediction) and from
Emotion Dictionary progress."""
from collections import defaultdict
from datetime import datetime, timezone
from typing import Iterable

from app.core.config import EMOTION_CLASSES

FIRST_STAR = "first-star"
EMO_EXPLORER = "emo-explorer"
HAPPY_CHAMP = "happy-champ"
PERFECT_GAME = "perfect-game"
CALM_MASTER = "calm-master"
WOW_EXPERT = "wow-expert"
FIVE_SESSIONS = "five-sessions"
SUPER_TEACHER = "super-teacher"
COMEBACK_KID = "comeback-kid"
BEST_FRIEND = "best-friend"
FEELINGS_EXPLORER = "feelings-explorer"

BADGE_IDS = [
    FIRST_STAR,
    EMO_EXPLORER,
    HAPPY_CHAMP,
    PERFECT_GAME,
    CALM_MASTER,
    WOW_EXPERT,
    FIVE_SESSIONS,
    SUPER_TEACHER,
    COMEBACK_KID,
    BEST_FRIEND,
    FEELINGS_EXPLORER,
]


def _local_date(dt: datetime):
    # SQLite returns naive datetimes that are really UTC; astimezone() on a
    # naive value would treat it as local time instead of converting it, so
    # UTC must be attached explicitly first.
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone().date()


def evaluate_earned_badges(finished_sessions: Iterable, dictionary_emotions: Iterable[str]) -> set:
    """finished_sessions: GameSession ORM objects (with .rounds loaded) that
    all have finished_at set. dictionary_emotions: the emotions completed in
    the Emotion Dictionary. Returns the set of badge ids currently earned."""
    ordered = sorted(finished_sessions, key=lambda s: s.finished_at)

    correct_by_emotion = defaultdict(int)
    total_correct = 0
    for session in ordered:
        for r in session.rounds:
            if r.child_correct:
                correct_by_emotion[r.target_emotion] += 1
                total_correct += 1

    earned = set()

    if total_correct >= 1:
        earned.add(FIRST_STAR)

    if all(correct_by_emotion.get(e, 0) >= 1 for e in ("happy", "sad", "angry", "surprised")):
        earned.add(EMO_EXPLORER)

    if correct_by_emotion.get("happy", 0) >= 5:
        earned.add(HAPPY_CHAMP)

    if correct_by_emotion.get("surprised", 0) >= 5:
        earned.add(WOW_EXPERT)

    if correct_by_emotion.get("sad", 0) >= 5 and correct_by_emotion.get("angry", 0) >= 5:
        earned.add(CALM_MASTER)

    if len(ordered) >= 5:
        earned.add(FIVE_SESSIONS)

    if any((session.score or 0) == 4 for session in ordered):
        earned.add(PERFECT_GAME)

    if total_correct >= 20:
        earned.add(SUPER_TEACHER)

    for prev, nxt in zip(ordered, ordered[1:]):
        if (prev.score or 0) <= 2 and (nxt.score or 0) > (prev.score or 0):
            earned.add(COMEBACK_KID)
            break

    distinct_local_days = {_local_date(session.finished_at) for session in ordered}
    if len(distinct_local_days) >= 5:
        earned.add(BEST_FRIEND)

    if set(EMOTION_CLASSES) <= set(dictionary_emotions):
        earned.add(FEELINGS_EXPLORER)

    return earned

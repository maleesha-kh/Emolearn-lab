"""Fixed Sri Lanka time (+05:30) for per-day limits.

A plain offset instead of zoneinfo, so there is no tzdata dependency on
Windows. Sri Lanka has no daylight saving time.
"""
from datetime import datetime, timedelta, timezone
from typing import Tuple

LOCAL_OFFSET = timedelta(hours=5, minutes=30)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def local_day_bounds_utc(now: datetime) -> Tuple[datetime, datetime]:
    """Start and end of the +05:30 day containing `now`, as naive UTC datetimes,
    which is how SQLite stores them."""
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    local = now.astimezone(timezone.utc).replace(tzinfo=None) + LOCAL_OFFSET
    start_local = local.replace(hour=0, minute=0, second=0, microsecond=0)
    start_utc = start_local - LOCAL_OFFSET
    return start_utc, start_utc + timedelta(days=1)

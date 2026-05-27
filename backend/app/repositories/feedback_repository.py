import json

from sqlalchemy.orm import Session

from app.models.feedback import Feedback


def get_all_votes_by_user(db: Session, user_id: int) -> dict[str, str]:
    rows = (
        db.query(Feedback.content_item_id, Feedback.vote)
        .filter(Feedback.user_id == user_id)
        .all()
    )
    # IDs are section-prefixed by the dashboard service (e.g. "meme-004",
    # "ai_insight_XXXXXX"), so cross-section collisions are impossible and the
    # flat dict keyed by content_item_id is unambiguous.
    return {row.content_item_id: row.vote for row in rows}


def upsert(
    db: Session,
    user_id: int,
    section_type: str,
    content_item_id: str,
    vote: str,
    content_snapshot: dict | None = None,
) -> Feedback:
    existing = (
        db.query(Feedback)
        .filter_by(
            user_id=user_id,
            section_type=section_type,
            content_item_id=content_item_id,
        )
        .first()
    )
    if existing:
        existing.vote = vote
        if content_snapshot is not None:
            existing.content_snapshot = json.dumps(content_snapshot)
    else:
        existing = Feedback(
            user_id=user_id,
            section_type=section_type,
            content_item_id=content_item_id,
            vote=vote,
            content_snapshot=json.dumps(content_snapshot) if content_snapshot is not None else None,
        )
        db.add(existing)
    db.commit()
    db.refresh(existing)
    return existing

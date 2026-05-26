from sqlalchemy.orm import Session

from app.models.feedback import Feedback

_SECTION_TYPES = {"market_news", "coin_prices", "ai_insight", "meme"}


def get_votes_by_daily_content(
    db: Session, user_id: int, daily_content_id: int
) -> dict[str, dict | None]:
    rows = (
        db.query(Feedback.section_type, Feedback.content_item_id, Feedback.vote)
        .filter_by(user_id=user_id, daily_content_id=daily_content_id)
        .all()
    )
    existing = {
        row.section_type: {"vote": row.vote, "content_item_id": row.content_item_id}
        for row in rows
    }
    return {s: existing.get(s) for s in _SECTION_TYPES}


def upsert(
    db: Session,
    user_id: int,
    daily_content_id: int,
    section_type: str,
    content_item_id: str,
    vote: str,
) -> Feedback:
    existing = (
        db.query(Feedback)
        .filter_by(
            user_id=user_id,
            daily_content_id=daily_content_id,
            section_type=section_type,
            content_item_id=content_item_id,
        )
        .first()
    )
    if existing:
        existing.vote = vote
    else:
        existing = Feedback(
            user_id=user_id,
            daily_content_id=daily_content_id,
            section_type=section_type,
            content_item_id=content_item_id,
            vote=vote,
        )
        db.add(existing)
    db.commit()
    db.refresh(existing)
    return existing

import json
from datetime import date

from sqlalchemy.orm import Session

from app.models.daily_content import DailyContent


def get_by_id(db: Session, record_id: int) -> DailyContent | None:
    return db.query(DailyContent).filter(DailyContent.id == record_id).first()


def delete_by_user_and_date(db: Session, user_id: int, target_date: date) -> None:
    record = get_by_user_and_date(db, user_id, target_date)
    if record:
        db.delete(record)
        db.commit()


def get_by_user_and_date(db: Session, user_id: int, target_date: date) -> DailyContent | None:
    return (
        db.query(DailyContent)
        .filter(DailyContent.user_id == user_id, DailyContent.date == target_date)
        .first()
    )


def upsert(
    db: Session,
    user_id: int,
    target_date: date,
    coin_prices: list,
    market_news: list,
    ai_insight: str,
    meme: dict,
) -> DailyContent:
    existing = get_by_user_and_date(db, user_id, target_date)
    if existing:
        existing.coin_prices = json.dumps(coin_prices)
        existing.market_news = json.dumps(market_news)
        existing.ai_insight = ai_insight
        existing.meme = json.dumps(meme)
        db.commit()
        db.refresh(existing)
        return existing

    record = DailyContent(
        user_id=user_id,
        date=target_date,
        coin_prices=json.dumps(coin_prices),
        market_news=json.dumps(market_news),
        ai_insight=ai_insight,
        meme=json.dumps(meme),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

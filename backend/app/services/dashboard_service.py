from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories import daily_content_repository, preference_repository
from app.schemas.dashboard import CoinPrice, DataSources, DashboardResponse, Meme, NewsArticle
from app.services import ai_service, coin_service, news_service
from app.utils import fallback_data


def get_dashboard(db: Session, user_id: int) -> DashboardResponse:
    pref = preference_repository.get_by_user_id(db, user_id)
    if not pref:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="Onboarding not completed. Please submit your preferences first.",
        )

    assets = pref.interested_assets.split(",")
    today = date.today()

    # Each service returns (data, "live" | "fallback")
    coin_prices, prices_source = coin_service.get_coin_prices(assets)
    market_news, news_source = news_service.get_news()
    ai_insight, insight_source = ai_service.get_ai_insight(assets, pref.investor_type)
    meme = fallback_data.get_meme()  # always static

    daily_content_repository.upsert(
        db,
        user_id=user_id,
        target_date=today,
        coin_prices=coin_prices,
        market_news=market_news,
        ai_insight=ai_insight,
        meme=meme,
    )

    return DashboardResponse(
        date=today,
        investor_type=pref.investor_type,
        interested_assets=assets,
        coin_prices=[CoinPrice(**p) for p in coin_prices],
        market_news=[NewsArticle(**n) for n in market_news],
        ai_insight=ai_insight,
        meme=Meme(**meme),
        data_sources=DataSources(
            coin_prices=prices_source,
            market_news=news_source,
            ai_insight=insight_source,
        ),
    )

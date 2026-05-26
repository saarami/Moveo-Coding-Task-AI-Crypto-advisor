import json
import logging
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories import daily_content_repository, preference_repository
from app.schemas.dashboard import CoinPrice, DataSources, DashboardResponse, Meme, NewsArticle
from app.services import ai_service, coin_service, news_service
from app.utils import fallback_data

logger = logging.getLogger(__name__)

_DISCLAIMER = "This is not financial advice."


def _infer_data_sources(coin_prices: list, market_news: list, ai_insight: str) -> DataSources:
    """
    Reconstruct data_sources labels from the cached content without storing them.

    Heuristics (all are stable properties of the current data generators):
    - coin_prices: CoinGecko live data sets name == symbol (e.g. BTC/BTC).
                   Fallback data uses full names (Bitcoin, Ethereum, …).
    - market_news: Every fallback article has source == "Demo Content".
                   CryptoPanic articles always have a real source name.
    - ai_insight:  Every live response passes through _normalise(), which appends
                   the disclaimer exactly once. Static fallback strings do not.
    """
    prices_src = (
        "live"
        if coin_prices and coin_prices[0].get("name") == coin_prices[0].get("symbol")
        else "fallback"
    )
    news_src = (
        "live"
        if market_news and market_news[0].get("source") != "Demo Content"
        else "fallback"
    )
    insight_src = (
        "live"
        if ai_insight and ai_insight.strip().endswith(_DISCLAIMER)
        else "fallback"
    )
    return DataSources(coin_prices=prices_src, market_news=news_src, ai_insight=insight_src)


def get_dashboard(db: Session, user_id: int) -> DashboardResponse:
    pref = preference_repository.get_by_user_id(db, user_id)
    if not pref:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="Onboarding not completed. Please submit your preferences first.",
        )

    assets = pref.interested_assets.split(",")
    today = date.today()

    # Serve from cache when today's snapshot already exists.
    cached = daily_content_repository.get_by_user_and_date(db, user_id, today)
    if cached and cached.coin_prices and cached.market_news and cached.ai_insight and cached.meme:
        logger.info("Dashboard cache hit for user_id=%s date=%s", user_id, today)
        coin_prices_cached = json.loads(cached.coin_prices)
        market_news_cached = json.loads(cached.market_news)
        ai_insight_cached  = cached.ai_insight
        meme_cached        = json.loads(cached.meme)
        return DashboardResponse(
            daily_content_id=cached.id,
            date=today,
            investor_type=pref.investor_type,
            interested_assets=assets,
            coin_prices=[CoinPrice(**p) for p in coin_prices_cached],
            market_news=[NewsArticle(**n) for n in market_news_cached],
            ai_insight=ai_insight_cached,
            meme=Meme(**meme_cached),
            data_sources=_infer_data_sources(coin_prices_cached, market_news_cached, ai_insight_cached),
        )

    # No cached snapshot for today — fetch from external services and save.
    logger.info("Dashboard cache miss for user_id=%s date=%s — fetching from APIs", user_id, today)
    coin_prices, prices_source = coin_service.get_coin_prices(assets)
    market_news, news_source = news_service.get_news()
    ai_insight, insight_source = ai_service.get_ai_insight(assets, pref.investor_type)
    meme = fallback_data.get_meme()

    record = daily_content_repository.upsert(
        db,
        user_id=user_id,
        target_date=today,
        coin_prices=coin_prices,
        market_news=market_news,
        ai_insight=ai_insight,
        meme=meme,
    )

    return DashboardResponse(
        daily_content_id=record.id,
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

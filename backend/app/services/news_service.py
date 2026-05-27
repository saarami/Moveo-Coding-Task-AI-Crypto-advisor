"""
NewsData.io news fetcher with fallback.

Requires NEWSDATA_API_KEY. If the key is absent or the call fails,
fallback_data articles are returned instead.

Returns (articles, "live") on success, (articles, "fallback") otherwise.

API docs: https://newsdata.io/documentation
"""

import logging

import httpx

from app.core.config import settings
from app.utils import fallback_data

logger = logging.getLogger(__name__)

_BASE_URL = "https://newsdata.io/api/1/latest"
_TIMEOUT = 8.0


def get_news() -> tuple[list[dict], str]:
    if not settings.NEWSDATA_API_KEY:
        logger.warning("NEWSDATA_API_KEY not set — using fallback news")
        return fallback_data.get_news(), "fallback"

    logger.info("Fetching news from NewsData.io")
    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            resp = client.get(
                _BASE_URL,
                params={
                    "apikey": settings.NEWSDATA_API_KEY,
                    "q": "cryptocurrency OR bitcoin OR ethereum",
                    "language": "en",
                    "size": 5,
                },
            )
            resp.raise_for_status()
            data = resp.json()

        articles = []
        for i, post in enumerate(data.get("results", [])[:5]):
            articles.append({
                "id": f"nd-{post.get('article_id', i)}",
                "title": post.get("title", ""),
                "summary": post.get("description") or post.get("title", ""),
                "source": post.get("source_name", "NewsData.io"),
                "url": post.get("link", "#"),
                "published_at": post.get("pubDate", ""),
            })

        if articles:
            logger.info("NewsData.io returned %d article(s) (source=live)", len(articles))
            return articles, "live"
        logger.warning("NewsData.io returned no articles — using fallback news")
        return fallback_data.get_news(), "fallback"

    except Exception as exc:
        logger.warning("NewsData.io request failed (%s); using fallback news", exc)
        return fallback_data.get_news(), "fallback"

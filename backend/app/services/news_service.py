"""
CryptoPanic news fetcher with fallback.

Requires CRYPTOPANIC_API_KEY. If the key is absent or the call fails,
fallback_data articles are returned instead.

Returns (articles, "live") on success, (articles, "fallback") otherwise.

API docs: https://cryptopanic.com/developers/api/
"""

import logging

import httpx

from app.core.config import settings
from app.utils import fallback_data

logger = logging.getLogger(__name__)

_BASE_URL = "https://cryptopanic.com/api/v1/posts/"
_TIMEOUT = 8.0


def get_news() -> tuple[list[dict], str]:
    if not settings.CRYPTOPANIC_API_KEY:
        return fallback_data.get_news(), "fallback"

    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            resp = client.get(
                _BASE_URL,
                params={
                    "auth_token": settings.CRYPTOPANIC_API_KEY,
                    "kind": "news",
                    "public": "true",
                },
            )
            resp.raise_for_status()
            data = resp.json()

        articles = []
        for i, post in enumerate(data.get("results", [])[:5]):
            articles.append({
                "id": f"cp-{post.get('id', i)}",
                "title": post.get("title", ""),
                "summary": post.get("title", ""),  # free tier has no body
                "source": post.get("source", {}).get("title", "CryptoPanic"),
                "url": post.get("url", "#"),
                "published_at": post.get("published_at", ""),
            })

        if articles:
            return articles, "live"
        return fallback_data.get_news(), "fallback"

    except Exception as exc:
        logger.warning("CryptoPanic request failed (%s); using fallback news", exc)
        return fallback_data.get_news(), "fallback"

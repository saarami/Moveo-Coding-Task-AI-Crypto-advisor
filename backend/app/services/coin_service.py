"""
CoinGecko price fetcher with fallback.

CoinGecko free tier: no key required, but rate-limited (~30 req/min).
Pro tier: pass COINGECKO_API_KEY for higher limits.

Returns (prices, "live") on success, (prices, "fallback") on any failure.
"""

import logging

import httpx

from app.core.config import settings
from app.utils import fallback_data

logger = logging.getLogger(__name__)

_SYMBOL_TO_ID = {
    "BTC":   "bitcoin",
    "ETH":   "ethereum",
    "SOL":   "solana",
    "BNB":   "binancecoin",
    "XRP":   "ripple",
    "ADA":   "cardano",
    "DOGE":  "dogecoin",
    "AVAX":  "avalanche-2",
    "DOT":   "polkadot",
    "MATIC": "matic-network",
}

_BASE_URL = "https://api.coingecko.com/api/v3"
_TIMEOUT = 8.0


def _build_headers() -> dict:
    headers = {"accept": "application/json"}
    if settings.COINGECKO_API_KEY:
        headers["x-cg-pro-api-key"] = settings.COINGECKO_API_KEY
    return headers


def get_coin_prices(assets: list[str]) -> tuple[list[dict], str]:
    ids = [_SYMBOL_TO_ID[a] for a in assets if a in _SYMBOL_TO_ID]
    if not ids:
        return fallback_data.get_coin_prices(assets), "fallback"

    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            resp = client.get(
                f"{_BASE_URL}/simple/price",
                params={
                    "ids": ",".join(ids),
                    "vs_currencies": "usd",
                    "include_24hr_change": "true",
                },
                headers=_build_headers(),
            )
            resp.raise_for_status()
            data = resp.json()

        results = []
        for asset in assets:
            coin_id = _SYMBOL_TO_ID.get(asset)
            if not coin_id or coin_id not in data:
                fb = fallback_data.get_coin_prices([asset])
                results.extend(fb)
                continue
            entry = data[coin_id]
            results.append({
                "name": asset,   # simple/price endpoint doesn't include names
                "symbol": asset,
                "price_usd": entry.get("usd", 0.0),
                "change_24h": round(entry.get("usd_24h_change", 0.0), 2),
            })
        return results, "live"

    except Exception as exc:
        logger.warning("CoinGecko request failed (%s); using fallback prices", exc)
        return fallback_data.get_coin_prices(assets), "fallback"

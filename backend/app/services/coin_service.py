"""
CoinGecko price fetcher with fallback.

CoinGecko public API works without an API key, but it is rate-limited.
If COINGECKO_API_KEY is provided for the public API, it is sent as a demo API key.

Returns (prices, "live") on success, (prices, "fallback") on any failure.
"""

import logging
from typing import Any

import httpx

from app.core.config import settings
from app.utils import fallback_data

logger = logging.getLogger(__name__)

_SYMBOL_TO_ID = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "SOL": "solana",
    "BNB": "binancecoin",
    "XRP": "ripple",
    "ADA": "cardano",
    "DOGE": "dogecoin",
    "AVAX": "avalanche-2",
    "DOT": "polkadot",
    "MATIC": "matic-network",
}

_BASE_URL = "https://api.coingecko.com/api/v3"
_TIMEOUT = 8.0


def _normalize_assets(assets: Any) -> list[str]:
    """
    Normalize asset input into a clean list of supported uppercase symbols.

    Supported examples:
    - "BTC,ETH" -> ["BTC", "ETH"]
    - ["BTC", "ETH"] -> ["BTC", "ETH"]
    - ["btc", " eth "] -> ["BTC", "ETH"]
    - "BTC, ETH, SOL" -> ["BTC", "ETH", "SOL"]
    """
    if not assets:
        return []

    if isinstance(assets, str):
        raw_assets = assets.split(",")
    else:
        raw_assets = []
        for asset in assets:
            if isinstance(asset, str) and "," in asset:
                raw_assets.extend(asset.split(","))
            else:
                raw_assets.append(asset)

    normalized_assets = []
    seen = set()

    for asset in raw_assets:
        symbol = str(asset).strip().upper()

        if symbol and symbol in _SYMBOL_TO_ID and symbol not in seen:
            normalized_assets.append(symbol)
            seen.add(symbol)

    return normalized_assets


def _build_headers() -> dict[str, str]:
    headers = {"accept": "application/json"}

    if settings.COINGECKO_API_KEY:
        headers["x-cg-demo-api-key"] = settings.COINGECKO_API_KEY

    return headers


def get_coin_prices(assets: Any) -> tuple[list[dict], str]:
    normalized_assets = _normalize_assets(assets)
    ids = [_SYMBOL_TO_ID[asset] for asset in normalized_assets]

    if not ids:
        logger.warning(
            "No supported CoinGecko assets found. raw_assets=%s normalized_assets=%s",
            assets,
            normalized_assets,
        )
        return fallback_data.get_coin_prices(normalized_assets), "fallback"

    try:
        params = {
            "ids": ",".join(ids),
            "vs_currencies": "usd",
            "include_24hr_change": "true",
        }

        logger.info(
            "Fetching CoinGecko prices. assets=%s ids=%s",
            normalized_assets,
            ids,
        )

        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.get(
                f"{_BASE_URL}/simple/price",
                params=params,
                headers=_build_headers(),
            )
            response.raise_for_status()
            data = response.json()

        results = []

        for asset in normalized_assets:
            coin_id = _SYMBOL_TO_ID.get(asset)

            if not coin_id or coin_id not in data:
                logger.warning(
                    "CoinGecko response missing asset. asset=%s coin_id=%s",
                    asset,
                    coin_id,
                )
                results.extend(fallback_data.get_coin_prices([asset]))
                continue

            entry = data[coin_id]

            results.append(
                {
                    "name": asset,
                    "symbol": asset,
                    "price_usd": entry.get("usd", 0.0),
                    "change_24h": round(entry.get("usd_24h_change", 0.0), 2),
                }
            )

        return results, "live"

    except Exception as exc:
        logger.warning(
            "CoinGecko request failed. raw_assets=%s normalized_assets=%s error=%s",
            assets,
            normalized_assets,
            exc,
        )
        return fallback_data.get_coin_prices(normalized_assets), "fallback"
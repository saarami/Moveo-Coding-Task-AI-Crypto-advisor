import random

# ---------------------------------------------------------------------------
# Static fallback coin prices (Phase 7). Replaced by CoinGecko in Phase 8.
# ---------------------------------------------------------------------------

_COIN_PRICES = {
    "BTC":   {"name": "Bitcoin",  "symbol": "BTC",  "price_usd": 67432.18, "change_24h": 1.23},
    "ETH":   {"name": "Ethereum", "symbol": "ETH",  "price_usd":  3521.44, "change_24h": -0.87},
    "SOL":   {"name": "Solana",   "symbol": "SOL",  "price_usd":   178.92, "change_24h": 3.41},
    "BNB":   {"name": "BNB",      "symbol": "BNB",  "price_usd":   598.10, "change_24h": 0.55},
    "XRP":   {"name": "XRP",      "symbol": "XRP",  "price_usd":     0.52, "change_24h": -1.10},
    "ADA":   {"name": "Cardano",  "symbol": "ADA",  "price_usd":     0.44, "change_24h": 2.07},
    "DOGE":  {"name": "Dogecoin", "symbol": "DOGE", "price_usd":     0.15, "change_24h": -0.33},
    "AVAX":  {"name": "Avalanche","symbol": "AVAX", "price_usd":    38.60, "change_24h": 4.12},
    "DOT":   {"name": "Polkadot", "symbol": "DOT",  "price_usd":     7.28, "change_24h": 1.88},
    "MATIC": {"name": "Polygon",  "symbol": "MATIC","price_usd":     0.87, "change_24h": -2.45},
}

# ---------------------------------------------------------------------------
# Static fallback news articles (Phase 7). Replaced by CryptoPanic in Phase 8.
# ---------------------------------------------------------------------------

_NEWS = [
    {
        "id": "news-001",
        "title": "Bitcoin Reaches New Monthly High Amid ETF Inflows",
        "summary": "Bitcoin surged past $67,000 as spot ETF products continued to attract institutional capital.",
        "source": "CryptoFallback News",
        "url": "#",
        "published_at": "2024-01-15T10:00:00Z",
    },
    {
        "id": "news-002",
        "title": "Ethereum Developers Confirm Next Upgrade Timeline",
        "summary": "The Ethereum core dev team announced the next network upgrade is on track for Q2.",
        "source": "CryptoFallback News",
        "url": "#",
        "published_at": "2024-01-15T08:30:00Z",
    },
    {
        "id": "news-003",
        "title": "Solana DeFi TVL Hits Record as New Projects Launch",
        "summary": "Total value locked on Solana-based protocols crossed $5 billion for the first time.",
        "source": "CryptoFallback News",
        "url": "#",
        "published_at": "2024-01-14T22:00:00Z",
    },
    {
        "id": "news-004",
        "title": "Regulators Signal Clearer Crypto Framework by Year-End",
        "summary": "Multiple jurisdictions are moving toward unified digital-asset regulations in 2024.",
        "source": "CryptoFallback News",
        "url": "#",
        "published_at": "2024-01-14T18:45:00Z",
    },
    {
        "id": "news-005",
        "title": "NFT Market Shows Signs of Recovery After Slow Quarter",
        "summary": "Trading volumes on major NFT platforms rebounded 35% in the past two weeks.",
        "source": "CryptoFallback News",
        "url": "#",
        "published_at": "2024-01-13T14:00:00Z",
    },
]

# ---------------------------------------------------------------------------
# Static fallback AI insights (Phase 7). Replaced by OpenRouter in Phase 8.
# ---------------------------------------------------------------------------

_AI_INSIGHTS = [
    "Bitcoin's recent consolidation above $65,000 suggests strong holder conviction. Watch for volume expansion as a signal of the next directional move.",
    "Ethereum's fee structure improvements continue to attract developers. Layer-2 adoption is accelerating and may compress mainnet gas costs further.",
    "Solana's high throughput is drawing DeFi liquidity away from competing chains. Monitor validator concentration as a potential decentralization risk.",
    "Altcoin season indicators are mixed — BTC dominance remains elevated, suggesting large-cap outperformance in the near term.",
    "Macro conditions remain supportive for risk assets. Watch Fed rate guidance and CPI prints as the primary external catalysts for crypto.",
    "On-chain data shows long-term holders are not distributing, which historically precedes bullish price action over 3–6 month horizons.",
]

# ---------------------------------------------------------------------------
# Static meme list (used permanently; no external API needed).
# ---------------------------------------------------------------------------

_MEMES = [
    {"id": "meme-001", "caption": "Me explaining Bitcoin to my family at dinner 🚀", "image_url": "https://i.imgflip.com/1bij.jpg"},
    {"id": "meme-002", "caption": "When the market dips and you already sold the bottom", "image_url": "https://i.imgflip.com/4t0m5.jpg"},
    {"id": "meme-003", "caption": "HODL they said. It'll be fine they said.", "image_url": "https://i.imgflip.com/9ehk.jpg"},
    {"id": "meme-004", "caption": "Checking portfolio every 5 minutes", "image_url": "https://i.imgflip.com/1ur9b0.jpg"},
    {"id": "meme-005", "caption": "Altseason loading… please wait", "image_url": "https://i.imgflip.com/5c7lwq.jpg"},
    {"id": "meme-006", "caption": "When someone asks if crypto is still a thing", "image_url": "https://i.imgflip.com/3oevdk.jpg"},
]


def get_coin_prices(assets: list[str]) -> list[dict]:
    return [_COIN_PRICES[a] for a in assets if a in _COIN_PRICES]


def get_news() -> list[dict]:
    return _NEWS[:5]


def get_ai_insight() -> str:
    return random.choice(_AI_INSIGHTS)


def get_meme() -> dict:
    return random.choice(_MEMES)

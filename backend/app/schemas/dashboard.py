from datetime import date

from pydantic import BaseModel


class CoinPrice(BaseModel):
    name: str
    symbol: str
    price_usd: float
    change_24h: float


class NewsArticle(BaseModel):
    id: str
    title: str
    summary: str
    source: str
    url: str
    published_at: str


class Meme(BaseModel):
    id: str
    caption: str
    image_url: str


class DashboardResponse(BaseModel):
    date: date
    investor_type: str
    interested_assets: list[str]
    coin_prices: list[CoinPrice]
    market_news: list[NewsArticle]
    ai_insight: str
    meme: Meme
    data_source: str = "fallback"

from typing import Literal

from pydantic import BaseModel


class FeedbackRequest(BaseModel):
    section_type:     Literal["market_news", "coin_prices", "ai_insight", "meme"]
    content_item_id:  str
    vote:             Literal["up", "down"]
    content_snapshot: dict | None = None


class FeedbackResponse(BaseModel):
    id: int
    section_type: str
    content_item_id: str
    vote: str

    model_config = {"from_attributes": True}


class VotesResponse(BaseModel):
    votes: dict[str, str]  # content_item_id -> "up" | "down"

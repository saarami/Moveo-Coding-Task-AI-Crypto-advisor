from typing import Literal

from pydantic import BaseModel


class FeedbackRequest(BaseModel):
    daily_content_id: int
    section_type: Literal["market_news", "coin_prices", "ai_insight", "meme"]
    content_item_id: str
    vote: Literal["up", "down"]


class FeedbackResponse(BaseModel):
    id: int
    section_type: str
    content_item_id: str
    vote: str

    model_config = {"from_attributes": True}


class VoteEntry(BaseModel):
    vote: str
    content_item_id: str


class VotesResponse(BaseModel):
    votes: dict[str, VoteEntry | None]

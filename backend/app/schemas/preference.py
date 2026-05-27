from datetime import datetime

from pydantic import BaseModel, field_validator

VALID_ASSETS = {"BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "AVAX", "DOT"}
VALID_INVESTOR_TYPES = {"beginner", "hodler", "day_trader", "nft_collector", "researcher"}
VALID_CONTENT_TYPES = {"news", "prices", "ai_insight", "meme"}


class PreferenceRequest(BaseModel):
    interested_assets: list[str]
    investor_type: str
    content_types: list[str]

    @field_validator("interested_assets")
    @classmethod
    def validate_assets(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("at least one asset is required")
        invalid = set(v) - VALID_ASSETS
        if invalid:
            raise ValueError(f"unknown assets: {invalid}. Valid: {VALID_ASSETS}")
        return v

    @field_validator("investor_type")
    @classmethod
    def validate_investor_type(cls, v: str) -> str:
        if v not in VALID_INVESTOR_TYPES:
            raise ValueError(f"invalid investor_type. Valid: {VALID_INVESTOR_TYPES}")
        return v

    @field_validator("content_types")
    @classmethod
    def validate_content_types(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("at least one content type is required")
        invalid = set(v) - VALID_CONTENT_TYPES
        if invalid:
            raise ValueError(f"unknown content types: {invalid}. Valid: {VALID_CONTENT_TYPES}")
        return v


class PreferenceResponse(BaseModel):
    id: int
    user_id: int
    interested_assets: list[str]
    investor_type: str
    content_types: list[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DailyContent(Base):
    __tablename__ = "daily_content"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    market_news: Mapped[str | None] = mapped_column(Text, nullable=True)
    coin_prices: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_insight: Mapped[str | None] = mapped_column(Text, nullable=True)
    meme: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_daily_content_user_date"),
    )

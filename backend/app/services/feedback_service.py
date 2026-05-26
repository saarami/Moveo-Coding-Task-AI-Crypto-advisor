from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories import daily_content_repository, feedback_repository
from app.schemas.feedback import FeedbackRequest, FeedbackResponse, VotesResponse


def get_votes(db: Session, user: User, daily_content_id: int) -> VotesResponse:
    daily = daily_content_repository.get_by_id(db, daily_content_id)
    if not daily or daily.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily content record not found.",
        )
    votes = feedback_repository.get_votes_by_daily_content(db, user.id, daily_content_id)
    return VotesResponse(votes=votes)


def submit_feedback(db: Session, user: User, req: FeedbackRequest) -> FeedbackResponse:
    daily = daily_content_repository.get_by_id(db, req.daily_content_id)
    if not daily or daily.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily content record not found.",
        )

    record = feedback_repository.upsert(
        db,
        user_id=user.id,
        daily_content_id=req.daily_content_id,
        section_type=req.section_type,
        content_item_id=req.content_item_id,
        vote=req.vote,
    )
    return FeedbackResponse.model_validate(record)

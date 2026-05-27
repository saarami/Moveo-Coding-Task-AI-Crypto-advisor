from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories import feedback_repository
from app.schemas.feedback import FeedbackRequest, FeedbackResponse, VotesResponse


def get_votes(db: Session, user: User) -> VotesResponse:
    votes = feedback_repository.get_all_votes_by_user(db, user.id)
    return VotesResponse(votes=votes)


def submit_feedback(db: Session, user: User, req: FeedbackRequest) -> FeedbackResponse:
    record = feedback_repository.upsert(
        db,
        user_id=user.id,
        section_type=req.section_type,
        content_item_id=req.content_item_id,
        vote=req.vote,
        content_snapshot=req.content_snapshot,
    )
    return FeedbackResponse.model_validate(record)

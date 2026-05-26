from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.feedback import FeedbackRequest, FeedbackResponse, VotesResponse
from app.services import feedback_service

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


@router.get("", response_model=VotesResponse)
def get_votes(
    daily_content_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return feedback_service.get_votes(db, current_user, daily_content_id)


@router.post("", response_model=FeedbackResponse)
def post_feedback(
    req: FeedbackRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return feedback_service.submit_feedback(db, current_user, req)

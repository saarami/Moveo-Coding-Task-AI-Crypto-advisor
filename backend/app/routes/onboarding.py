from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.preference import PreferenceRequest, PreferenceResponse
from app.services import onboarding_service

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])


@router.get("/preferences", response_model=PreferenceResponse)
def get_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return onboarding_service.get_preferences(db, current_user.id)


@router.post("/preferences", response_model=PreferenceResponse, status_code=201)
def save_preferences(
    req: PreferenceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return onboarding_service.save_preferences(db, current_user.id, req)

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories import preference_repository
from app.schemas.preference import PreferenceRequest, PreferenceResponse


def _to_response(pref) -> PreferenceResponse:
    return PreferenceResponse(
        id=pref.id,
        user_id=pref.user_id,
        interested_assets=pref.interested_assets.split(","),
        investor_type=pref.investor_type,
        content_types=pref.content_types.split(","),
        created_at=pref.created_at,
        updated_at=pref.updated_at,
    )


def get_preferences(db: Session, user_id: int) -> PreferenceResponse:
    pref = preference_repository.get_by_user_id(db, user_id)
    if not pref:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Onboarding not completed yet",
        )
    return _to_response(pref)


def save_preferences(db: Session, user_id: int, req: PreferenceRequest) -> PreferenceResponse:
    assets_str = ",".join(req.interested_assets)
    content_str = ",".join(req.content_types)

    existing = preference_repository.get_by_user_id(db, user_id)
    if existing:
        pref = preference_repository.update(
            db, existing, assets_str, req.investor_type, content_str
        )
    else:
        pref = preference_repository.create(
            db, user_id, assets_str, req.investor_type, content_str
        )
    return _to_response(pref)

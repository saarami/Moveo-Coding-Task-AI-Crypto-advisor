from sqlalchemy.orm import Session

from app.models.preference import UserPreference


def get_by_user_id(db: Session, user_id: int) -> UserPreference | None:
    return db.query(UserPreference).filter(UserPreference.user_id == user_id).first()


def create(
    db: Session,
    user_id: int,
    interested_assets: str,
    investor_type: str,
    content_types: str,
) -> UserPreference:
    pref = UserPreference(
        user_id=user_id,
        interested_assets=interested_assets,
        investor_type=investor_type,
        content_types=content_types,
    )
    db.add(pref)
    db.commit()
    db.refresh(pref)
    return pref


def update(
    db: Session,
    pref: UserPreference,
    interested_assets: str,
    investor_type: str,
    content_types: str,
) -> UserPreference:
    pref.interested_assets = interested_assets
    pref.investor_type = investor_type
    pref.content_types = content_types
    db.commit()
    db.refresh(pref)
    return pref

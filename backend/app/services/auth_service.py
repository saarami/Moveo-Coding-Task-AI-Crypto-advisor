from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.repositories import user_repository
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse


def register(db: Session, req: RegisterRequest) -> TokenResponse:
    if user_repository.get_by_email(db, req.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    hashed = hash_password(req.password)
    user = user_repository.create(db, name=req.name, email=req.email, hashed_password=hashed)
    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


def login(db: Session, req: LoginRequest) -> TokenResponse:
    user = user_repository.get_by_email(db, req.email)
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


def get_current_user(db: Session, user_id: int) -> User:
    user = user_repository.get_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user

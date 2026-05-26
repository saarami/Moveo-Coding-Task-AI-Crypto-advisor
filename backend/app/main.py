import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routes import auth, dashboard, feedback, onboarding

logger = logging.getLogger(__name__)

_PLACEHOLDER_KEYS = {
    "change-me-to-a-long-random-string",
    "change-me-in-production",
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.SECRET_KEY in _PLACEHOLDER_KEYS:
        logger.warning(
            "SECRET_KEY is set to a known placeholder value. "
            "JWT tokens are cryptographically insecure. "
            "Set a strong random SECRET_KEY before deploying to production."
        )
    yield


app = FastAPI(
    title=settings.APP_NAME,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(onboarding.router)
app.include_router(dashboard.router)
app.include_router(feedback.router)


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok"}

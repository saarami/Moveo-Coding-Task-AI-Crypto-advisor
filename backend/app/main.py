import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routes import auth, dashboard, feedback, onboarding

# Route application loggers (app.*) to stdout with INFO level.
# Uvicorn configures its own loggers with propagate=False and never touches the
# root logger, so without this call all logger.info() calls from services are
# silently dropped (root logger defaults to WARNING with no handlers).
logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s:     %(name)s - %(message)s",
)
# httpx/httpcore log full request URLs at INFO level, which exposes API keys in
# query strings (e.g. NewsData.io ?apikey=...). Raise their threshold to WARNING
# so only actual errors are printed; our own app.* loggers are unaffected.
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

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

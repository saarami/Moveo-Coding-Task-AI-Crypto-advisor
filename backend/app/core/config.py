from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "AI Crypto Advisor"
    DEBUG: bool = True
    SECRET_KEY: str = "change-me-to-a-long-random-string"

    # Comma-separated list of allowed CORS origins, e.g.:
    # CORS_ORIGINS=http://localhost:5173,https://myapp.vercel.app
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

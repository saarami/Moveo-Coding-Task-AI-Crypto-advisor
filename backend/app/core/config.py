from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "AI Crypto Advisor"
    DEBUG: bool = True
    SECRET_KEY: str = "change-me-to-a-long-random-string"

    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/crypto_advisor"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

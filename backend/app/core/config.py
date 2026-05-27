from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "AI Crypto Advisor"
    SECRET_KEY: str = "change-me-to-a-long-random-string"

    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/crypto_advisor"

    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # External APIs — empty string means "no key, use fallback"
    COINGECKO_API_KEY: str = ""
    NEWSDATA_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    HUGGINGFACE_API_KEY: str = ""
    HUGGINGFACE_MODEL: str = "Qwen/Qwen2.5-7B-Instruct"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

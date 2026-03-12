from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Rule24 API"
    app_env: str = "development"
    api_prefix: str = "/api"
    database_url: str = "postgresql+psycopg://rule24:rule24@localhost:5432/rule24"
    jwt_secret_key: str = "change_me_for_production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    yookassa_shop_id: str | None = None
    yookassa_secret_key: str | None = None
    yookassa_return_url: str = "http://127.0.0.1:8080/app/settings"
    yookassa_webhook_secret: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()

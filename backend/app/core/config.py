from functools import lru_cache

from pydantic import AnyHttpUrl, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AJIO Inspired Ecommerce API"
    environment: str = "development"
    database_url: str = Field(
        default="mysql+pymysql://ecommerce_user:ecommerce_password@127.0.0.1:3306/ecommerce"
    )
    secret_key: str = Field(default="change-this-secret-in-production", min_length=16)
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    cors_origins: list[AnyHttpUrl | str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str = "no-reply@example.com"
    smtp_use_tls: bool = True
    otp_expire_minutes: int = 10

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @model_validator(mode="after")
    def require_mysql_database(self):
        if not self.database_url.startswith("mysql+pymysql://"):
            raise ValueError("DATABASE_URL must use MySQL with the mysql+pymysql:// SQLAlchemy driver")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()

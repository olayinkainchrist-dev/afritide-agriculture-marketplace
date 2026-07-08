"""
Afritide - Application Configuration
"""

from pydantic_settings import BaseSettings
from pydantic import validator
from typing import List
import secrets


class Settings(BaseSettings):
    # ── APP ─────────────────────────────────────────────────────────────
    APP_NAME: str = "Afritide Agriculture Marketplace"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # ── DATABASE ─────────────────────────────────────────────────────────
    DATABASE_URL: str

    # ── SECURITY ─────────────────────────────────────────────────────────
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440       # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ── CORS ─────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: List[str] = ["*"]

    @validator("ALLOWED_ORIGINS", pre=True)
    def parse_origins(cls, v):
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        return v

    # ── SUPABASE ─────────────────────────────────────────────────────────
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    # ── EMAIL ─────────────────────────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@afritide.com"
    EMAIL_FROM_NAME: str = "Afritide Agriculture Marketplace"

    # ── CLOUDINARY ────────────────────────────────────────────────────────
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    # ── RESEND ────────────────────────────────────────────────────────────────────
    RESEND_API_KEY: str = ""
    # ── PAYSTACK ─────────────────────────────────────────────────────────
    PAYSTACK_SECRET_KEY: str = ""
    PAYSTACK_PUBLIC_KEY: str = ""

    # ── FLUTTERWAVE ───────────────────────────────────────────────────────
    FLUTTERWAVE_SECRET_KEY: str = ""
    FLUTTERWAVE_PUBLIC_KEY: str = ""

    # ── STRIPE ───────────────────────────────────────────────────────────
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLIC_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # ── GOOGLE MAPS ───────────────────────────────────────────────────────
    GOOGLE_MAPS_API_KEY: str = ""

    # ── PAGINATION ────────────────────────────────────────────────────────
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    # ── FILE UPLOAD ───────────────────────────────────────────────────────
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_IMAGE_TYPES: List[str] = ["image/jpeg", "image/png", "image/webp"]
    ALLOWED_DOC_TYPES: List[str] = ["application/pdf"]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
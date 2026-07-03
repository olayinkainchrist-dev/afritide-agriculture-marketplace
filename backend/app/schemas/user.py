"""
Afritide - User Schemas (Pydantic)
"""

from pydantic import BaseModel, EmailStr, validator, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID

from app.models.user import UserRole, UserStatus, VerificationBadge


class UserRegisterSchema(BaseModel):
    email: EmailStr
    phone: Optional[str] = None
    password: str = Field(..., min_length=8, description="Minimum 8 characters")
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    role: UserRole = UserRole.BUYER
    business_name: Optional[str] = None
    country: Optional[str] = None

    @validator("password")
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserLoginSchema(BaseModel):
    email: EmailStr
    password: str


class OTPVerifySchema(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)


class OTPResendSchema(BaseModel):
    email: EmailStr


class PasswordResetRequestSchema(BaseModel):
    email: EmailStr


class PasswordResetSchema(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class ChangePasswordSchema(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


class UserUpdateSchema(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    business_name: Optional[str] = None
    website: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    language: Optional[str] = None
    currency: Optional[str] = None
    email_notifications: Optional[bool] = None
    sms_notifications: Optional[bool] = None

    # Farmer specific
    farm_name: Optional[str] = None
    farm_size_hectares: Optional[float] = None
    years_of_experience: Optional[int] = None
    farm_description: Optional[str] = None
    farm_latitude: Optional[float] = None
    farm_longitude: Optional[float] = None

    # Exporter specific
    export_license_number: Optional[str] = None


class UserPublicSchema(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    business_name: Optional[str]
    profile_image: Optional[str]
    role: UserRole
    badge: VerificationBadge
    country: Optional[str]
    state: Optional[str]
    rating_average: float
    rating_count: int
    total_sales: int
    years_of_experience: Optional[int]
    farm_name: Optional[str]
    is_featured: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserProfileSchema(UserPublicSchema):
    email: str
    phone: Optional[str]
    status: UserStatus
    city: Optional[str]
    address: Optional[str]
    bio: Optional[str]
    website: Optional[str]
    email_verified: bool
    phone_verified: bool
    kyc_approved: bool
    subscription_plan: str
    currency: str
    language: str
    response_rate: float
    last_login: Optional[datetime]

    class Config:
        from_attributes = True


class TokenSchema(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserProfileSchema


class RefreshTokenSchema(BaseModel):
    refresh_token: str

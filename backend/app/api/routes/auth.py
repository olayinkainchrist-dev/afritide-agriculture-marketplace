"""
Afritide - Authentication Routes
Registration, Login, OTP Verification, Password Reset, Token Refresh
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import logging
import uuid

from app.core.database import get_db
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    decode_token, generate_otp, generate_password_reset_token
)
from app.core.dependencies import get_current_user
from app.core.responses import success_response
from app.models.user import User, UserStatus
from app.schemas.user import (
    UserRegisterSchema, UserLoginSchema, OTPVerifySchema,
    OTPResendSchema, PasswordResetRequestSchema, PasswordResetSchema,
    ChangePasswordSchema, RefreshTokenSchema, UserProfileSchema
)
from app.services.email import send_otp_email, send_welcome_email, send_password_reset_email
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()


def _serialize_user(user: User) -> dict:
    """Serialize user to JSON-safe dict using Pydantic v2."""
    return UserProfileSchema.model_validate(user).model_dump(mode="json")


@router.post("/register", summary="Register a new user")
async def register(
    payload: UserRegisterSchema,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    if payload.phone:
        existing_phone = db.query(User).filter(User.phone == payload.phone).first()
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this phone number already exists",
            )

    otp = generate_otp()
    otp_expiry = datetime.utcnow() + timedelta(minutes=15)

    user = User(
        email=payload.email,
        phone=payload.phone if payload.phone else None,
        password_hash=hash_password(payload.password),
        first_name=payload.first_name,
        last_name=payload.last_name,
        role=payload.role,
        business_name=payload.business_name,
        country=payload.country,
        status=UserStatus.PENDING,
        otp_code=otp,
        otp_expires_at=otp_expiry,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    send_otp_email(user.email, user.first_name, otp)
    logger.info(f"New user registered: {user.email} ({user.role})")

    return success_response(
        data={
            "user_id": str(user.id),
            "email": user.email,
            "role": user.role,
            "message": "Registration successful. Please verify your email with the OTP sent.",
        },
        message="Account created successfully",
        status_code=201,
    )


@router.post("/verify-otp", summary="Verify email with OTP")
async def verify_otp(
    payload: OTPVerifySchema,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == payload.email).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.email_verified:
        raise HTTPException(status_code=400, detail="Email already verified")

    if user.otp_code != payload.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP code")

    if user.otp_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    user.email_verified = True
    user.status = UserStatus.ACTIVE
    user.otp_code = None
    user.otp_expires_at = None
    db.commit()

    background_tasks.add_task(send_welcome_email, user.email, user.first_name, user.role)

    return success_response(message="Email verified successfully. Welcome to Afritide!")


@router.post("/resend-otp", summary="Resend OTP verification code")
async def resend_otp(
    payload: OTPResendSchema,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.email_verified:
        raise HTTPException(status_code=400, detail="Email already verified")

    otp = generate_otp()
    user.otp_code = otp
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=15)
    db.commit()

    send_otp_email(user.email, user.first_name, otp)

    return success_response(message="New OTP sent to your email")


@router.post("/login", summary="Login and get access token")
async def login(
    payload: UserLoginSchema,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == payload.email).first()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in",
        )

    if user.status == UserStatus.SUSPENDED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is suspended. Please contact support.",
        )

    if user.status == UserStatus.BANNED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been permanently banned.",
        )

    user.last_login = datetime.utcnow()
    db.commit()
    db.refresh(user)

    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return success_response(
        data={
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": _serialize_user(user),
        },
        message="Login successful",
    )


@router.post("/refresh", summary="Refresh access token")
async def refresh_token(
    payload: RefreshTokenSchema,
    db: Session = Depends(get_db),
):
    token_data = decode_token(payload.refresh_token)

    if not token_data or token_data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user_id = token_data.get("sub")
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    access_token = create_access_token({"sub": str(user.id), "role": user.role})

    return success_response(
        data={"access_token": access_token, "token_type": "bearer"},
        message="Token refreshed successfully",
    )


@router.post("/forgot-password", summary="Request password reset")
async def forgot_password(
    payload: PasswordResetRequestSchema,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == payload.email).first()

    if user:
        token = generate_password_reset_token()
        user.password_reset_token = token
        user.password_reset_expires = datetime.utcnow() + timedelta(hours=1)
        db.commit()
        background_tasks.add_task(send_password_reset_email, user.email, user.first_name, token)

    return success_response(
        message="If an account with that email exists, a password reset link has been sent."
    )


@router.post("/reset-password", summary="Reset password with token")
async def reset_password(
    payload: PasswordResetSchema,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(
        User.password_reset_token == payload.token
    ).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    if user.password_reset_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset token has expired")

    user.password_hash = hash_password(payload.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    db.commit()

    return success_response(message="Password reset successfully. You can now login.")


@router.post("/change-password", summary="Change password while logged in")
async def change_password(
    payload: ChangePasswordSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    current_user.password_hash = hash_password(payload.new_password)
    db.commit()

    return success_response(message="Password changed successfully")


@router.get("/me", summary="Get current user profile")
async def get_me(current_user: User = Depends(get_current_user)):
    return success_response(
        data=_serialize_user(current_user),
        message="Profile retrieved",
    )


@router.post("/logout", summary="Logout (client-side token invalidation)")
async def logout(current_user: User = Depends(get_current_user)):
    return success_response(message="Logged out successfully")


class GoogleAuthPayload(BaseModel):
    email:      str
    first_name: str
    last_name:  str
    google_id:  str
    avatar_url: str = ""


@router.post("/google", summary="Google OAuth login/register")
async def google_auth(
    payload: GoogleAuthPayload,
    db:      Session = Depends(get_db),
):
    from app.models.user import UserRole, UserStatus
    from app.core.security import create_access_token, create_refresh_token

    # Check if user exists
    user = db.query(User).filter(User.email == payload.email).first()

    if not user:
        # Create new user
        user = User(
            email=          payload.email,
            first_name=     payload.first_name,
            last_name=      payload.last_name,
            password_hash=  "",  # No password for Google users
            role=           UserRole.BUYER,
            status=         UserStatus.ACTIVE,
            email_verified= True,
            google_id=      payload.google_id,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Send welcome email in background
        try:
            send_welcome_email(user.email, user.first_name, user.role)
        except Exception:
            pass  # Don't fail auth if email fails
    else:
        # Update google_id if not set
        if not getattr(user, "google_id", None):
            user.google_id = payload.google_id
            db.commit()

    access_token  = create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return success_response(data={
        "access_token":  access_token,
        "refresh_token": refresh_token,
        "token_type":    "bearer",
        "user": {
            "id":         str(user.id),
            "email":      user.email,
            "first_name": user.first_name,
            "last_name":  user.last_name,
            "role":       user.role,
            "status":     user.status,
        }
    })
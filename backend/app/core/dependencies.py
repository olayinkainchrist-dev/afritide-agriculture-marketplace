"""
Afritide - FastAPI Dependencies
Authentication, authorization, and common dependencies
"""

from fastapi import Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
import logging

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User, UserRole, UserStatus

logger = logging.getLogger(__name__)

security = HTTPBearer()


# ── AUTH DEPENDENCIES ─────────────────────────────────────────────────────────

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Get the currently authenticated user"""
    token = credentials.credentials
    payload = decode_token(token)

    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if user.status == UserStatus.SUSPENDED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been suspended. Contact support.",
        )

    if user.status == UserStatus.BANNED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been banned.",
        )

    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Get current user - must be active"""
    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not yet verified. Please verify your email.",
        )
    return current_user


def get_optional_user(
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
) -> Optional[User]:
    """Get current user if authenticated, else None"""
    if not credentials:
        return None
    try:
        token = credentials.credentials
        payload = decode_token(token)
        if not payload:
            return None
        user_id = payload.get("sub")
        return db.query(User).filter(User.id == user_id).first()
    except Exception:
        return None


# ── ROLE DEPENDENCIES ─────────────────────────────────────────────────────────

def require_role(*roles: UserRole):
    """Factory to create role-checking dependencies"""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join([r.value for r in roles])}",
            )
        return current_user
    return role_checker


def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


def get_farmer_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in [UserRole.FARMER, UserRole.COOPERATIVE, UserRole.EXPORTER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Farmer/Seller access required",
        )
    return current_user


def get_buyer_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in [UserRole.BUYER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Buyer access required",
        )
    return current_user


# ── PAGINATION ────────────────────────────────────────────────────────────────

class PaginationParams:
    def __init__(
        self,
        page: int = Query(default=1, ge=1, description="Page number"),
        page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    ):
        self.page = page
        self.page_size = page_size
        self.offset = (page - 1) * page_size


def get_pagination(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> PaginationParams:
    return PaginationParams(page=page, page_size=page_size)

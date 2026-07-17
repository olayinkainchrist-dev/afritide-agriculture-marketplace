"""
Afritide - Subscription Model
"""

from sqlalchemy import Column, String, Boolean, DateTime, Float, Integer, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
import enum

from app.core.database import Base


class SubscriptionPlan(str, enum.Enum):
    FREE     = "free"
    PRO      = "pro"
    BUSINESS = "business"


class SubscriptionStatus(str, enum.Enum):
    ACTIVE    = "active"
    EXPIRED   = "expired"
    CANCELLED = "cancelled"
    PENDING   = "pending"


PLAN_FEATURES = {
    "free": {
        "max_listings":       5,
        "priority_search":    False,
        "analytics":          False,
        "top_seller_badge":   False,
        "promoted_listings":  0,
        "support":            "standard",
        "price_monthly_ngn":  0,
        "price_annual_ngn":   0,
        "price_monthly_usd":  0,
        "price_annual_usd":   0,
    },
    "pro": {
        "max_listings":       20,
        "priority_search":    True,
        "analytics":          True,
        "top_seller_badge":   True,
        "promoted_listings":  3,
        "support":            "priority",
        "price_monthly_ngn":  5000,
        "price_annual_ngn":   50000,
        "price_monthly_usd":  10,
        "price_annual_usd":   100,
    },
    "business": {
        "max_listings":       999,
        "priority_search":    True,
        "analytics":          True,
        "top_seller_badge":   True,
        "promoted_listings":  10,
        "support":            "dedicated",
        "price_monthly_ngn":  15000,
        "price_annual_ngn":   150000,
        "price_monthly_usd":  30,
        "price_annual_usd":   300,
    },
}


class Subscription(Base):
    __tablename__ = "subscriptions"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id          = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan             = Column(String(50), nullable=False)
    billing_cycle    = Column(String(20), nullable=False)  # monthly / annual
    status           = Column(String(20), default="active", nullable=False)
    amount_paid      = Column(Float, nullable=False)
    currency         = Column(String(10), nullable=False)
    payment_method   = Column(String(50), nullable=True)
    payment_reference= Column(String(255), nullable=True)
    started_at       = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at       = Column(DateTime, nullable=False)
    cancelled_at     = Column(DateTime, nullable=True)
    created_at       = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", foreign_keys=[user_id])

    def __repr__(self):
        return f"<Subscription {self.plan} - {self.user_id}>"
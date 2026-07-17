"""
Afritide - Subscription Model
"""

from sqlalchemy import Column, String, Boolean, DateTime, Float, Integer, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from app.core.database import Base


class SubscriptionPlan(str):
    FREE       = "free"
    PRO        = "pro"
    BUSINESS   = "business"
    ENTERPRISE = "enterprise"


PLAN_FEATURES = {
    "free": {
        "max_listings":        10,
        "commission_rate":     5.0,
        "priority_search":     False,
        "analytics":           "basic",
        "verified_badge":      False,
        "promoted_listings":   0,
        "support":             "community",
        "price_monthly_ngn":   0,
        "price_annual_ngn":    0,
        "price_monthly_usd":   0,
        "price_annual_usd":    0,
        "impact": [
            "10 product listings",
            "Basic marketplace access",
            "Buyer messaging & order management",
            "Basic analytics",
            "Community support",
        ],
        "locked": [
            "Priority search placement",
            "Verified Seller badge",
            "Promoted listings",
            "Advanced analytics",
            "Price trend reports",
        ],
    },
    "pro": {
        "max_listings":        50,
        "commission_rate":     3.5,
        "priority_search":     True,
        "analytics":           "advanced",
        "verified_badge":      True,
        "promoted_listings":   5,
        "support":             "priority",
        "price_monthly_ngn":   5000,
        "price_annual_ngn":    50000,
        "price_monthly_usd":   10,
        "price_annual_usd":    100,
        "impact": [
            "50 product listings",
            "Priority search placement",
            "Verified Seller badge",
            "5 promoted listings/month",
            "Analytics + price trend reports",
            "Priority support",
            "AI sales insights",
            "Export buyer inquiries",
            "Discounted shipping quotes",
            "Daily commodity prices & alerts",
            "Lower 3.5% marketplace commission",
        ],
        "locked": [
            "Dedicated account manager",
            "Custom storefront",
            "Unlimited promotions",
            "Historical price charts",
            "Freight forwarding assistance",
        ],
    },
    "business": {
        "max_listings":        9999,
        "commission_rate":     2.0,
        "priority_search":     True,
        "analytics":           "enterprise",
        "verified_badge":      True,
        "promoted_listings":   999,
        "support":             "dedicated",
        "price_monthly_ngn":   15000,
        "price_annual_ngn":    150000,
        "price_monthly_usd":   30,
        "price_annual_usd":    300,
        "impact": [
            "Unlimited listings",
            "Premium placement in search",
            "Business Verified badge",
            "Dedicated account manager",
            "Custom branded storefront",
            "Unlimited promoted listings",
            "Historical price charts & forecasts",
            "Priority logistics support",
            "Freight forwarding assistance",
            "Container booking support",
            "Export documentation tools",
            "RFQ management",
            "2% marketplace commission",
        ],
        "locked": [],
    },
    "enterprise": {
        "max_listings":        9999,
        "commission_rate":     0.0,
        "priority_search":     True,
        "analytics":           "custom",
        "verified_badge":      True,
        "promoted_listings":   999,
        "support":             "sla",
        "price_monthly_ngn":   0,
        "price_annual_ngn":    0,
        "price_monthly_usd":   0,
        "price_annual_usd":    0,
        "impact": [
            "Unlimited everything",
            "Multi-user accounts",
            "API access & ERP integration",
            "Dedicated success manager",
            "White-label storefront",
            "Bulk procurement tools",
            "Contract management",
            "Custom reporting & SLA support",
            "AI demand predictions",
            "Negotiated commission rates",
        ],
        "locked": [],
    },
}


class Subscription(Base):
    __tablename__ = "subscriptions"

    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id           = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan              = Column(String(50), nullable=False)
    billing_cycle     = Column(String(20), nullable=False)
    status            = Column(String(20), default="active", nullable=False)
    amount_paid       = Column(Float, nullable=False)
    currency          = Column(String(10), nullable=False)
    payment_method    = Column(String(50), nullable=True)
    payment_reference = Column(String(255), nullable=True)
    started_at        = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at        = Column(DateTime, nullable=False)
    cancelled_at      = Column(DateTime, nullable=True)
    created_at        = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", foreign_keys=[user_id])

    def __repr__(self):
        return f"<Subscription {self.plan} - {self.user_id}>"
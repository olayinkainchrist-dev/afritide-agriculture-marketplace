"""
Afritide - Referral & Commission Models
"""
from sqlalchemy import Column, String, Boolean, DateTime, Float, Integer, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base


class ReferralCode(Base):
    __tablename__ = "referral_codes"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id     = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    code        = Column(String(20), unique=True, nullable=False, index=True)
    is_active   = Column(Boolean, default=True)
    click_count = Column(Integer, default=0)
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])


class ReferralRelationship(Base):
    __tablename__ = "referral_relationships"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    referrer_id   = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    referred_id   = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    referral_code = Column(String(20), nullable=False)
    campaign_id   = Column(UUID(as_uuid=True), nullable=True)
    status        = Column(String(30), default="REGISTERED")
    risk_level    = Column(String(20), default="LOW")
    registered_at = Column(DateTime, default=datetime.utcnow)
    verified_at   = Column(DateTime, nullable=True)
    qualified_at  = Column(DateTime, nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow)

    referrer = relationship("User", foreign_keys=[referrer_id])
    referred = relationship("User", foreign_keys=[referred_id])


class ReferralClick(Base):
    __tablename__ = "referral_clicks"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    referral_code = Column(String(20), nullable=False, index=True)
    ip_address    = Column(String(50), nullable=True)
    user_agent    = Column(Text, nullable=True)
    converted     = Column(Boolean, default=False)
    created_at    = Column(DateTime, default=datetime.utcnow)


class CommissionRule(Base):
    __tablename__ = "commission_rules"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name                = Column(String(100), nullable=False)
    description         = Column(Text, nullable=True)
    commission_type     = Column(String(20), default="PERCENTAGE")
    commission_rate     = Column(Float, default=10.0)
    fixed_amount        = Column(Float, default=0.0)
    max_commission      = Column(Float, nullable=True)
    min_transaction     = Column(Float, default=0.0)
    holding_days        = Column(Integer, default=30)
    attribution_days    = Column(Integer, default=30)
    min_withdrawal      = Column(Float, default=5000.0)
    eligible_user_types = Column(JSONB, default=list)
    is_active           = Column(Boolean, default=True)
    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ReferralCampaign(Base):
    __tablename__ = "referral_campaigns"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name            = Column(String(100), nullable=False)
    description     = Column(Text, nullable=True)
    commission_rate = Column(Float, nullable=False)
    max_commission  = Column(Float, nullable=True)
    start_date      = Column(DateTime, nullable=False)
    end_date        = Column(DateTime, nullable=False)
    eligible_types  = Column(JSONB, default=list)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, default=datetime.utcnow)


class CommissionTransaction(Base):
    __tablename__ = "commission_transactions"

    id                 = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    referrer_id        = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    referred_id        = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    order_id           = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=True, unique=True)
    rule_id            = Column(UUID(as_uuid=True), ForeignKey("commission_rules.id"), nullable=True)
    campaign_id        = Column(UUID(as_uuid=True), ForeignKey("referral_campaigns.id"), nullable=True)
    transaction_amount = Column(Float, nullable=False)
    platform_fee       = Column(Float, nullable=False)
    commission_rate    = Column(Float, nullable=False)
    commission_amount  = Column(Float, nullable=False)
    currency           = Column(String(10), default="NGN")
    exchange_rate      = Column(Float, default=1.0)
    status             = Column(String(30), default="PENDING", index=True)
    risk_level         = Column(String(20), default="LOW")
    held_until         = Column(DateTime, nullable=True)
    available_at       = Column(DateTime, nullable=True)
    paid_at            = Column(DateTime, nullable=True)
    reversed_at        = Column(DateTime, nullable=True)
    reversal_reason    = Column(Text, nullable=True)
    notes              = Column(Text, nullable=True)
    created_at         = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at         = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    referrer = relationship("User", foreign_keys=[referrer_id])
    referred = relationship("User", foreign_keys=[referred_id])
    rule     = relationship("CommissionRule", foreign_keys=[rule_id])
    campaign = relationship("ReferralCampaign", foreign_keys=[campaign_id])


class ReferralWithdrawal(Base):
    __tablename__ = "referral_withdrawals"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id        = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    amount         = Column(Float, nullable=False)
    currency       = Column(String(10), default="NGN")
    bank_name      = Column(String(100), nullable=True)
    account_number = Column(String(20), nullable=True)
    account_name   = Column(String(100), nullable=True)
    bank_code      = Column(String(20), nullable=True)
    status         = Column(String(20), default="PENDING", index=True)
    reference      = Column(String(100), unique=True, nullable=True)
    admin_notes    = Column(Text, nullable=True)
    processed_at   = Column(DateTime, nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow)
    updated_at     = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])


class ReferralRiskEvent(Base):
    __tablename__ = "referral_risk_events"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id     = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    event_type  = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    event_data  = Column(JSONB, default=dict)
    created_at  = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
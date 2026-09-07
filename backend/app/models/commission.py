"""
Afritide - Seller Commission & Fee Models
"""
from sqlalchemy import Column, String, Boolean, DateTime, Numeric, Integer, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base


class SellerCommissionRule(Base):
    __tablename__ = "seller_commission_rules"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name             = Column(String(100), nullable=False)
    description      = Column(Text, nullable=True)
    seller_type      = Column(String(50), nullable=True)   # NULL = all types
    transaction_type = Column(String(50), nullable=True)   # NULL = all types
    category         = Column(String(100), nullable=True)  # NULL = all categories
    rate_percentage  = Column(Numeric(5, 2), nullable=False)
    min_amount       = Column(Numeric(15, 2), default=0)
    max_amount       = Column(Numeric(15, 2), nullable=True)
    priority         = Column(Integer, default=10)
    is_active        = Column(Boolean, default=True)
    effective_from   = Column(DateTime, default=datetime.utcnow)
    effective_until  = Column(DateTime, nullable=True)
    created_by       = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at       = Column(DateTime, default=datetime.utcnow)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SellerCommissionProfile(Base):
    __tablename__ = "seller_commission_profiles"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    seller_id      = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    custom_rate    = Column(Numeric(5, 2), nullable=False)
    reason         = Column(Text, nullable=True)
    effective_from = Column(DateTime, default=datetime.utcnow)
    effective_until= Column(DateTime, nullable=True)
    is_active      = Column(Boolean, default=True)
    created_by     = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow)

    seller = relationship("User", foreign_keys=[seller_id])


class TransactionFee(Base):
    __tablename__ = "transaction_fees"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id        = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    seller_id       = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    fee_type        = Column(String(50), nullable=False)  # COMMISSION, PAYMENT_FEE, LOGISTICS, OTHER
    rate_percentage = Column(Numeric(5, 2), nullable=True)
    base_amount     = Column(Numeric(15, 2), nullable=False)
    fee_amount      = Column(Numeric(15, 2), nullable=False)
    currency        = Column(String(10), default="NGN")
    rule_id         = Column(UUID(as_uuid=True), ForeignKey("seller_commission_rules.id"), nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)

    seller = relationship("User", foreign_keys=[seller_id])


class SellerPayout(Base):
    __tablename__ = "seller_payouts"

    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    seller_id         = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    order_id          = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False, unique=True)
    gross_amount      = Column(Numeric(15, 2), nullable=False)
    commission_rate   = Column(Numeric(5, 2), nullable=False)
    commission_amount = Column(Numeric(15, 2), nullable=False)
    payment_fee       = Column(Numeric(15, 2), default=0)
    logistics_fee     = Column(Numeric(15, 2), default=0)
    other_fees        = Column(Numeric(15, 2), default=0)
    refund_amount     = Column(Numeric(15, 2), default=0)
    net_amount        = Column(Numeric(15, 2), nullable=False)
    currency          = Column(String(10), default="NGN")
    payout_status     = Column(String(30), default="PENDING")
    payout_date       = Column(DateTime, nullable=True)
    created_at        = Column(DateTime, default=datetime.utcnow)
    updated_at        = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    seller = relationship("User", foreign_keys=[seller_id])


class CommissionAuditLog(Base):
    __tablename__ = "commission_audit_logs"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rule_id        = Column(UUID(as_uuid=True), ForeignKey("seller_commission_rules.id"), nullable=True)
    previous_value = Column(JSONB, nullable=True)
    new_value      = Column(JSONB, nullable=True)
    action         = Column(String(50), nullable=False)
    reason         = Column(Text, nullable=True)
    performed_by   = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow)
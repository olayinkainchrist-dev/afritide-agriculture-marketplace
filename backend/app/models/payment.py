"""
Afritide - Payment Model
"""

from sqlalchemy import Column, String, DateTime, Enum, Text, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
import enum

from app.core.database import Base


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"


class PaymentMethod(str, enum.Enum):
    PAYSTACK = "paystack"
    FLUTTERWAVE = "flutterwave"
    STRIPE = "stripe"
    BANK_TRANSFER = "bank_transfer"
    ESCROW = "escrow"
    LETTER_OF_CREDIT = "letter_of_credit"
    WALLET = "wallet"


class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False, index=True)
    payer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    method = Column(Enum(PaymentMethod), nullable=False)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False, index=True)
    gateway_reference = Column(String(255), nullable=True)
    gateway_response = Column(JSON, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    refunded_at = Column(DateTime, nullable=True)
    refund_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    order = relationship("Order", back_populates="payment")

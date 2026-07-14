"""
Afritide - Request for Quotation (RFQ) Model
"""

from sqlalchemy import Column, String, Boolean, DateTime, Enum, Text, Float, Integer, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
import enum

from app.core.database import Base


class RFQStatus(str, enum.Enum):
    OPEN      = "OPEN"
    QUOTED    = "QUOTED"
    ACCEPTED  = "ACCEPTED"
    REJECTED  = "REJECTED"
    CONVERTED = "CONVERTED"
    EXPIRED   = "EXPIRED"
    CANCELLED = "CANCELLED"


class RFQ(Base):
    __tablename__ = "rfqs"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rfq_number = Column(String(50), unique=True, nullable=False, index=True)
    buyer_id   = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    seller_id  = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=True)
    status     = Column(Enum(RFQStatus), default=RFQStatus.OPEN, nullable=False, index=True)

    product_name            = Column(String(255), nullable=False)
    category                = Column(String(100), nullable=True)
    quantity                = Column(Float,        nullable=False)
    unit                    = Column(String(50),   nullable=False)
    target_price            = Column(Float,        nullable=True)
    currency                = Column(String(10),   default="NGN", nullable=False)
    delivery_country        = Column(String(100),  nullable=True)
    delivery_date           = Column(DateTime,     nullable=True)
    specifications          = Column(Text,         nullable=True)
    additional_requirements = Column(Text,         nullable=True)

    quoted_price       = Column(Float,    nullable=True)
    quoted_quantity    = Column(Float,    nullable=True)
    quote_valid_until  = Column(DateTime, nullable=True)
    quote_notes        = Column(Text,     nullable=True)
    quote_attachments  = Column(JSON,     nullable=True)

    expires_at          = Column(DateTime,                                          nullable=True)
    accepted_at         = Column(DateTime,                                          nullable=True)
    converted_order_id  = Column(UUID(as_uuid=True), ForeignKey("orders.id"),       nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow,                 nullable=False)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    buyer   = relationship("User", foreign_keys=[buyer_id],  back_populates="rfqs_as_buyer")
    seller  = relationship("User", foreign_keys=[seller_id], back_populates="rfqs_as_seller")
    product = relationship("Product", back_populates="rfqs")

    def __repr__(self):
        return f"<RFQ {self.rfq_number}>"
"""
Afritide - Notification Model
"""

from sqlalchemy import Column, String, Boolean, DateTime, Enum, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
import enum

from app.core.database import Base


class NotificationType(str, enum.Enum):
    ORDER_PLACED      = "ORDER_PLACED"
    ORDER_CONFIRMED   = "ORDER_CONFIRMED"
    ORDER_SHIPPED     = "ORDER_SHIPPED"
    ORDER_DELIVERED   = "ORDER_DELIVERED"
    ORDER_CANCELLED   = "ORDER_CANCELLED"
    PAYMENT_RECEIVED  = "PAYMENT_RECEIVED"
    PAYMENT_FAILED    = "PAYMENT_FAILED"
    NEW_MESSAGE       = "NEW_MESSAGE"
    NEW_RFQ           = "NEW_RFQ"
    RFQ_QUOTED        = "RFQ_QUOTED"
    RFQ_ACCEPTED      = "RFQ_ACCEPTED"
    NEW_REVIEW        = "NEW_REVIEW"
    ACCOUNT_VERIFIED  = "ACCOUNT_VERIFIED"
    ACCOUNT_SUSPENDED = "ACCOUNT_SUSPENDED"
    PRODUCT_APPROVED  = "PRODUCT_APPROVED"
    PRODUCT_REJECTED  = "PRODUCT_REJECTED"
    PRICE_ALERT       = "PRICE_ALERT"
    SYSTEM            = "SYSTEM"
    ANNOUNCEMENT      = "ANNOUNCEMENT"
    NEW_ORDER         = "NEW_ORDER"

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(Enum(NotificationType), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    data = Column(JSON, nullable=True)              # Extra context data
    is_read = Column(Boolean, default=False, nullable=False)
    read_at = Column(DateTime, nullable=True)
    action_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="notifications")

    def __repr__(self):
        return f"<Notification {self.type} for {self.user_id}>"

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
    ORDER_PLACED = "order_placed"
    ORDER_CONFIRMED = "order_confirmed"
    ORDER_SHIPPED = "order_shipped"
    ORDER_DELIVERED = "order_delivered"
    ORDER_CANCELLED = "order_cancelled"
    PAYMENT_RECEIVED = "payment_received"
    PAYMENT_FAILED = "payment_failed"
    NEW_MESSAGE = "new_message"
    NEW_RFQ = "new_rfq"
    RFQ_QUOTED = "rfq_quoted"
    RFQ_ACCEPTED = "rfq_accepted"
    NEW_REVIEW = "new_review"
    ACCOUNT_VERIFIED = "account_verified"
    ACCOUNT_SUSPENDED = "account_suspended"
    PRODUCT_APPROVED = "product_approved"
    PRODUCT_REJECTED = "product_rejected"
    PRICE_ALERT = "price_alert"
    SYSTEM = "system"
    ANNOUNCEMENT = "announcement"


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

"""
Afritide - Price Alert Model
"""
from sqlalchemy import Column, String, Boolean, DateTime, Float, Enum
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
import enum

from app.core.database import Base


class AlertType(str, enum.Enum):
    ABOVE = "above"
    BELOW = "below"
    ANY_CHANGE = "any_change"


class PriceAlert(Base):
    __tablename__ = "price_alerts"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id        = Column(UUID(as_uuid=True), nullable=False, index=True)
    commodity_name = Column(String(255), nullable=False)
    alert_type     = Column(Enum(AlertType), default=AlertType.ANY_CHANGE, nullable=False)
    target_price   = Column(Float, nullable=True)
    currency       = Column(String(10), default="USD")
    is_active      = Column(Boolean, default=True)
    last_triggered = Column(DateTime, nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<PriceAlert {self.commodity_name} {self.alert_type}>"
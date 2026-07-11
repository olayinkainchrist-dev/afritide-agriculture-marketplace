"""
Afritide - Commodity Price Board Model
Live commodity prices with trend tracking
"""

from sqlalchemy import Column, String, Boolean, DateTime, Enum, Text, Float, Integer, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
import enum

from app.core.database import Base


class PriceTrend(str, enum.Enum):
    UP     = "up"
    DOWN   = "down"
    STABLE = "stable"


class PriceType(str, enum.Enum):
    FARM_GATE     = "farm_gate"
    WHOLESALE     = "wholesale"
    RETAIL        = "retail"
    EXPORT        = "export"
    INTERNATIONAL = "international"


class CommodityPrice(Base):
    __tablename__ = "commodity_prices"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    commodity_name   = Column(String(255), nullable=False, index=True)
    category         = Column(String(100), nullable=True)
    price_type       = Column(Enum(PriceType), default=PriceType.WHOLESALE, nullable=False)
    price            = Column(Float, nullable=False)
    previous_price   = Column(Float, nullable=True)
    currency         = Column(String(10), default="USD", nullable=False)
    unit             = Column(String(50), nullable=False)
    trend            = Column(Enum(PriceTrend), default=PriceTrend.STABLE, nullable=False)
    change_percentage= Column(Float, nullable=True)
    market           = Column(String(100), nullable=True)
    region           = Column(String(100), nullable=True)
    country          = Column(String(100), nullable=True)
    is_export_price  = Column(Boolean, default=False)
    is_domestic_price= Column(Boolean, default=True)
    source           = Column(String(255), nullable=True)
    notes            = Column(Text, nullable=True)
    is_active        = Column(Boolean, default=True, nullable=False)
    updated_by       = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at       = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    price_history = relationship("CommodityPriceHistory", back_populates="commodity", lazy="dynamic")

    def __repr__(self):
        return f"<CommodityPrice {self.commodity_name} {self.price_type} {self.price} {self.currency}>"


class CommodityPriceHistory(Base):
    __tablename__ = "commodity_price_history"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    commodity_id = Column(UUID(as_uuid=True), ForeignKey("commodity_prices.id", ondelete="CASCADE"), nullable=False)
    price        = Column(Float, nullable=False)
    currency     = Column(String(10), default="USD", nullable=False)
    recorded_at  = Column(DateTime, default=datetime.utcnow, nullable=False)

    commodity = relationship("CommodityPrice", back_populates="price_history")
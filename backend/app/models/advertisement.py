"""
Afritide - Advertisement Model
"""

from sqlalchemy import Column, String, Boolean, DateTime, Enum, Text, Float, Integer, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
import enum

from app.core.database import Base


class AdStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    PAUSED = "paused"
    EXPIRED = "expired"
    REJECTED = "rejected"


class AdPlacement(str, enum.Enum):
    HOMEPAGE_HERO = "homepage_hero"
    HOMEPAGE_BANNER = "homepage_banner"
    CATEGORY_TOP = "category_top"
    SIDEBAR = "sidebar"
    PRODUCT_PAGE = "product_page"
    SEARCH_RESULTS = "search_results"


class Advertisement(Base):
    __tablename__ = "advertisements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    advertiser_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=False)
    target_url = Column(String(500), nullable=False)
    placement = Column(Enum(AdPlacement), nullable=False)
    status = Column(Enum(AdStatus), default=AdStatus.PENDING)
    budget = Column(Float, nullable=True)
    cost_per_click = Column(Float, nullable=True)
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    starts_at = Column(DateTime, nullable=True)
    ends_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Advertisement {self.title}>"

"""
Afritide - Analytics Model
Platform-wide and per-user analytics tracking
"""

from sqlalchemy import Column, String, DateTime, Text, Float, Integer, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from app.core.database import Base


class PageView(Base):
    __tablename__ = "page_views"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    page_type = Column(String(100), nullable=False)    # homepage, product, category, etc.
    page_url = Column(String(500), nullable=True)
    referrer = Column(String(500), nullable=True)
    user_agent = Column(String(500), nullable=True)
    ip_address = Column(String(50), nullable=True)
    country = Column(String(100), nullable=True)
    session_id = Column(String(100), nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class PlatformAnalytics(Base):
    __tablename__ = "platform_analytics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    date = Column(DateTime, nullable=False, index=True)
    total_users = Column(Integer, default=0)
    new_users = Column(Integer, default=0)
    active_users = Column(Integer, default=0)
    total_products = Column(Integer, default=0)
    new_products = Column(Integer, default=0)
    total_orders = Column(Integer, default=0)
    new_orders = Column(Integer, default=0)
    total_revenue = Column(Float, default=0.0)
    total_rfqs = Column(Integer, default=0)
    total_messages = Column(Integer, default=0)
    top_categories = Column(JSON, nullable=True)
    top_products = Column(JSON, nullable=True)
    top_countries = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

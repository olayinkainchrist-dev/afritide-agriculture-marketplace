"""
Afritide - Warehouse Model
"""

from sqlalchemy import Column, String, Boolean, DateTime, Text, Float, Integer, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from app.core.database import Base


class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    country = Column(String(100), nullable=False)
    state = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    capacity_tonnes = Column(Float, nullable=True)
    available_capacity_tonnes = Column(Float, nullable=True)
    temperature_controlled = Column(Boolean, default=False)
    min_temperature = Column(Float, nullable=True)
    max_temperature = Column(Float, nullable=True)
    commodities_accepted = Column(JSON, nullable=True)
    storage_rate_per_tonne = Column(Float, nullable=True)
    currency = Column(String(10), default="USD")
    certifications = Column(JSON, nullable=True)
    images = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    rating_average = Column(Float, default=0.0)
    rating_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Warehouse {self.name}>"

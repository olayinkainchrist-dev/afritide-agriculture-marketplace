"""
Afritide - Logistics Model
"""

from sqlalchemy import Column, String, Boolean, DateTime, Enum, Text, Float, Integer, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
import enum

from app.core.database import Base


class ShipmentStatus(str, enum.Enum):
    BOOKED = "booked"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    CUSTOMS = "customs"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    RETURNED = "returned"
    CANCELLED = "cancelled"


class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False, index=True)
    tracking_number = Column(String(100), unique=True, nullable=True, index=True)
    carrier = Column(String(100), nullable=True)
    status = Column(Enum(ShipmentStatus), default=ShipmentStatus.BOOKED)
    origin_country = Column(String(100), nullable=True)
    origin_address = Column(Text, nullable=True)
    destination_country = Column(String(100), nullable=True)
    destination_address = Column(Text, nullable=True)
    weight_kg = Column(Float, nullable=True)
    dimensions = Column(JSON, nullable=True)   # {l, w, h}
    shipping_cost = Column(Float, nullable=True)
    insurance_cost = Column(Float, nullable=True)
    currency = Column(String(10), default="USD")
    estimated_arrival = Column(DateTime, nullable=True)
    actual_arrival = Column(DateTime, nullable=True)
    tracking_history = Column(JSON, nullable=True)  # List of status updates
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Shipment {self.tracking_number}>"

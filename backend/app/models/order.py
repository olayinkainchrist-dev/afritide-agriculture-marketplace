"""
Afritide - Order Model
"""

from sqlalchemy import Column, String, Boolean, DateTime, Enum, Text, Float, Integer, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
import enum

from app.core.database import Base


class OrderStatus(str, enum.Enum):
    PENDING    = "PENDING"
    CONFIRMED  = "CONFIRMED"
    PROCESSING = "PROCESSING"
    SHIPPED    = "SHIPPED"
    DELIVERED  = "DELIVERED"
    COMPLETED  = "COMPLETED"
    CANCELLED  = "CANCELLED"
    DISPUTED   = "DISPUTED"
    REFUNDED   = "REFUNDED"


class Order(Base):
    __tablename__ = "orders"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_number = Column(String(50), unique=True, nullable=False, index=True)
    buyer_id     = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    seller_id    = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    status       = Column(Enum(OrderStatus), default=OrderStatus.PENDING, nullable=False, index=True)

    # Pricing
    subtotal        = Column(Float, nullable=False)
    shipping_cost   = Column(Float, default=0.0)
    tax_amount      = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    platform_fee    = Column(Float, default=0.0)
    total_amount    = Column(Float, nullable=False)
    currency        = Column(String(10), default="NGN", nullable=False)

    # Payment
    payment_method    = Column(String(50),  nullable=True)
    payment_reference = Column(String(255), nullable=True)
    paid_at           = Column(DateTime,    nullable=True)

    # Shipping
    shipping_address   = Column(JSON,        nullable=True)
    shipping_method    = Column(String(100), nullable=True)
    tracking_number    = Column(String(100), nullable=True)
    estimated_delivery = Column(DateTime,    nullable=True)
    delivered_at       = Column(DateTime,    nullable=True)

    # Notes
    buyer_notes         = Column(Text, nullable=True)
    seller_notes        = Column(Text, nullable=True)
    cancellation_reason = Column(Text, nullable=True)

    # Timestamps
    confirmed_at = Column(DateTime, nullable=True)
    shipped_at   = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    created_at   = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    buyer   = relationship("User", foreign_keys=[buyer_id],  back_populates="orders_as_buyer")
    seller  = relationship("User", foreign_keys=[seller_id], back_populates="orders_as_seller")
    items   = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payment = relationship("Payment", back_populates="order", uselist=False)

    def __repr__(self):
        return f"<Order {self.order_number}>"


class OrderItem(Base):
    __tablename__ = "order_items"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id         = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id       = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    quantity         = Column(Float,       nullable=False)
    unit             = Column(String(50),  nullable=False)
    unit_price       = Column(Float,       nullable=False)
    total_price      = Column(Float,       nullable=False)
    product_snapshot = Column(JSON,        nullable=True)
    created_at       = Column(DateTime,    default=datetime.utcnow)

    order   = relationship("Order",   back_populates="items")
    product = relationship("Product", back_populates="order_items")
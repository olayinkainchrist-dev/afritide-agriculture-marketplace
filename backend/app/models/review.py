"""
Afritide - Review Model
"""

from sqlalchemy import Column, String, DateTime, Enum, Text, Float, Integer, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
import enum

from app.core.database import Base


class Review(Base):
    __tablename__ = "reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    reviewee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=True, index=True)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=True)

    # Ratings (1-5)
    overall_rating = Column(Float, nullable=False)
    quality_rating = Column(Float, nullable=True)
    delivery_rating = Column(Float, nullable=True)
    communication_rating = Column(Float, nullable=True)
    packaging_rating = Column(Float, nullable=True)

    title = Column(String(255), nullable=True)
    comment = Column(Text, nullable=True)
    images = Column(String(2000), nullable=True)  # JSON list
    is_verified_purchase = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)
    seller_reply = Column(Text, nullable=True)
    seller_replied_at = Column(DateTime, nullable=True)
    is_approved = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    reviewer = relationship("User", foreign_keys=[reviewer_id], back_populates="reviews_given")
    reviewee = relationship("User", foreign_keys=[reviewee_id], back_populates="reviews_received")
    product = relationship("Product", back_populates="reviews")

    def __repr__(self):
        return f"<Review {self.overall_rating}★ by {self.reviewer_id}>"

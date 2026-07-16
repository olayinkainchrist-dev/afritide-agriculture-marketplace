"""
Afritide - User Model
"""

from sqlalchemy import (
    Column, String, Boolean, DateTime, Enum, Text,
    Float, Integer, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
import enum

from app.core.database import Base


class UserRole(str, enum.Enum):
    BUYER              = "BUYER"
    FARMER             = "FARMER"
    COOPERATIVE        = "COOPERATIVE"
    EXPORTER           = "EXPORTER"
    PROCESSING_COMPANY = "PROCESSING_COMPANY"
    LOGISTICS_PROVIDER = "LOGISTICS_PROVIDER"
    WAREHOUSE_OPERATOR = "WAREHOUSE_OPERATOR"
    GOVERNMENT_AGENCY  = "GOVERNMENT_AGENCY"
    ADMIN              = "ADMIN"


class UserStatus(str, enum.Enum):
    PENDING      = "PENDING"
    ACTIVE       = "ACTIVE"
    UNDER_REVIEW = "UNDER_REVIEW"
    VERIFIED     = "VERIFIED"
    SUSPENDED    = "SUSPENDED"
    BANNED       = "BANNED"


class VerificationBadge(str, enum.Enum):
    NONE                 = "NONE"
    VERIFIED_FARMER      = "VERIFIED_FARMER"
    VERIFIED_EXPORTER    = "VERIFIED_EXPORTER"
    GOLD_SUPPLIER        = "GOLD_SUPPLIER"
    PREMIUM_SELLER       = "PREMIUM_SELLER"
    GOVERNMENT_CERTIFIED = "GOVERNMENT_CERTIFIED"


class User(Base):
    __tablename__ = "users"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email         = Column(String(255), unique=True, nullable=False, index=True)
    phone         = Column(String(20), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=False)
    role          = Column(Enum(UserRole), nullable=False, default=UserRole.BUYER)
    status        = Column(Enum(UserStatus), nullable=False, default=UserStatus.PENDING)
    badge         = Column(Enum(VerificationBadge), nullable=False, default=VerificationBadge.NONE)

    # Personal Info
    first_name     = Column(String(100), nullable=False)
    last_name      = Column(String(100), nullable=False)
    profile_image  = Column(String(500), nullable=True)
    bio            = Column(Text, nullable=True)
    date_of_birth  = Column(DateTime, nullable=True)

    # Business Info
    business_name                = Column(String(255), nullable=True)
    business_registration_number = Column(String(100), nullable=True)
    tax_id                       = Column(String(100), nullable=True)
    website                      = Column(String(255), nullable=True)

    # Location
    country     = Column(String(100), nullable=True)
    state       = Column(String(100), nullable=True)
    city        = Column(String(100), nullable=True)
    address     = Column(Text, nullable=True)
    latitude    = Column(Float, nullable=True)
    longitude   = Column(Float, nullable=True)
    postal_code = Column(String(20), nullable=True)

    # Farmer Specific
    farm_name            = Column(String(255), nullable=True)
    farm_size_hectares   = Column(Float, nullable=True)
    years_of_experience  = Column(Integer, nullable=True)
    farm_description     = Column(Text, nullable=True)
    farm_latitude        = Column(Float, nullable=True)
    farm_longitude       = Column(Float, nullable=True)

    # Exporter Specific
    export_license_number = Column(String(100), nullable=True)
    export_countries      = Column(Text, nullable=True)

    # Verification
    email_verified      = Column(Boolean, default=False, nullable=False)
    phone_verified      = Column(Boolean, default=False, nullable=False)
    kyc_submitted       = Column(Boolean, default=False, nullable=False)
    kyc_approved        = Column(Boolean, default=False, nullable=False)
    kyc_document_url    = Column(String(500), nullable=True)
    kyc_submitted_at    = Column(DateTime, nullable=True)
    kyc_reviewed_at     = Column(DateTime, nullable=True)

    # OTP
    otp_code               = Column(String(10), nullable=True)
    otp_expires_at         = Column(DateTime, nullable=True)
    password_reset_token   = Column(String(200), nullable=True)
    password_reset_expires = Column(DateTime, nullable=True)

    # Settings
    language                = Column(String(10), default="en", nullable=False)
    currency                = Column(String(10), default="USD", nullable=False)
    email_notifications     = Column(Boolean, default=True, nullable=False)
    sms_notifications       = Column(Boolean, default=True, nullable=False)
    whatsapp_notifications  = Column(Boolean, default=False, nullable=False)

    # Stats
    total_orders       = Column(Integer, default=0, nullable=False)
    total_sales        = Column(Integer, default=0, nullable=False)
    total_spent        = Column(Float, default=0.0, nullable=False)
    rating_average     = Column(Float, default=0.0, nullable=False)
    rating_count       = Column(Integer, default=0, nullable=False)
    response_rate      = Column(Float, default=0.0, nullable=False)
    response_time_hours= Column(Float, nullable=True)
    followers_count    = Column(Integer, default=0, nullable=False)
    following_count    = Column(Integer, default=0, nullable=False)

    # Subscription
    is_featured         = Column(Boolean, default=False, nullable=False)
    featured_until      = Column(DateTime, nullable=True)
    subscription_plan   = Column(String(50), default="free", nullable=False)
    subscription_expires= Column(DateTime, nullable=True)

    # Timestamps
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # ── Relationships ─────────────────────────────────────────────────
    products          = relationship("Product", back_populates="seller", lazy="dynamic")
    orders_as_buyer   = relationship("Order", foreign_keys="Order.buyer_id",   back_populates="buyer",    lazy="dynamic")
    orders_as_seller  = relationship("Order", foreign_keys="Order.seller_id",  back_populates="seller",   lazy="dynamic")
    sent_messages     = relationship("Message", foreign_keys="Message.sender_id",   back_populates="sender",   lazy="dynamic")
    received_messages = relationship("Message", foreign_keys="Message.receiver_id", back_populates="receiver", lazy="dynamic")
    rfqs_as_buyer     = relationship("RFQ", foreign_keys="RFQ.buyer_id",  back_populates="buyer",  lazy="dynamic")
    rfqs_as_seller    = relationship("RFQ", foreign_keys="RFQ.seller_id", back_populates="seller", lazy="dynamic")
    reviews_given     = relationship("Review", foreign_keys="Review.reviewer_id", back_populates="reviewer", lazy="dynamic")
    reviews_received  = relationship("Review", foreign_keys="Review.reviewee_id", back_populates="reviewee", lazy="dynamic")
    notifications     = relationship("Notification", back_populates="user", lazy="dynamic")
    certificates      = relationship("Certificate", foreign_keys="Certificate.user_id", back_populates="user", lazy="dynamic")
    wishlisted_products = relationship("Wishlist", back_populates="user", lazy="dynamic")
    following         = relationship("FollowSupplier", foreign_keys="FollowSupplier.follower_id", back_populates="follower", lazy="dynamic")
    followers         = relationship("FollowSupplier", foreign_keys="FollowSupplier.supplier_id", back_populates="supplier", lazy="dynamic")

    def __repr__(self):
        return f"<User {self.email} ({self.role})>"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def display_name(self):
        return self.business_name or self.full_name


class Wishlist(Base):
    __tablename__ = "wishlists"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user    = relationship("User", back_populates="wishlisted_products")
    product = relationship("Product", back_populates="wishlisted_by")


class FollowSupplier(Base):
    __tablename__ = "follow_suppliers"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    follower_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    supplier_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at  = Column(DateTime, default=datetime.utcnow, nullable=False)

    follower = relationship("User", foreign_keys=[follower_id], back_populates="following")
    supplier = relationship("User", foreign_keys=[supplier_id], back_populates="followers")

    __table_args__ = (
        UniqueConstraint("follower_id", "supplier_id", name="uq_follow_supplier"),
    )
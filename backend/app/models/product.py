"""
Afritide - Product & Category Models
Covers all 10 categories: Livestock, Dairy, Cash Crops,
Fruits, Vegetables, Fishery, Poultry, Machinery, Seeds, Fertilizers
"""

from sqlalchemy import (
    Column, String, Boolean, DateTime, Enum, Text,
    Float, Integer, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
import enum

from app.core.database import Base


class ProductCategory(str, enum.Enum):
    LIVESTOCK   = "LIVESTOCK"
    DAIRY       = "DAIRY"
    CASH_CROPS  = "CASH_CROPS"
    FRUITS      = "FRUITS"
    VEGETABLES  = "VEGETABLES"
    FISHERY     = "FISHERY"
    POULTRY     = "POULTRY"
    MACHINERY   = "MACHINERY"
    SEEDS       = "SEEDS"
    FERTILIZERS = "FERTILIZERS"


class ProductStatus(str, enum.Enum):
    DRAFT          = "DRAFT"
    PENDING_REVIEW = "PENDING_REVIEW"
    ACTIVE         = "ACTIVE"
    OUT_OF_STOCK   = "OUT_OF_STOCK"
    SUSPENDED      = "SUSPENDED"
    REJECTED       = "REJECTED"
    ARCHIVED       = "ARCHIVED"


class UnitOfMeasure(str, enum.Enum):
    KG     = "KG"
    TONNE  = "TONNE"
    GRAM   = "GRAM"
    LITRE  = "LITRE"
    PIECE  = "PIECE"
    BAG    = "BAG"
    CRATE  = "CRATE"
    DOZEN  = "DOZEN"
    BUNCH  = "BUNCH"
    HEAD   = "HEAD"
    UNIT   = "UNIT"


class ProductGrade(str, enum.Enum):
    GRADE_A        = "GRADE_A"
    GRADE_B        = "GRADE_B"
    GRADE_C        = "GRADE_C"
    PREMIUM        = "PREMIUM"
    STANDARD       = "STANDARD"
    ORGANIC        = "ORGANIC"
    EXPORT_QUALITY = "EXPORT_QUALITY"


class Category(Base):
    __tablename__ = "categories"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name          = Column(String(100), unique=True, nullable=False)
    slug          = Column(String(100), unique=True, nullable=False, index=True)
    description   = Column(Text, nullable=True)
    icon          = Column(String(255), nullable=True)
    image_url     = Column(String(500), nullable=True)
    parent_id     = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True)
    sort_order    = Column(Integer, default=0, nullable=False)
    is_active     = Column(Boolean, default=True, nullable=False)
    product_count = Column(Integer, default=0, nullable=False)
    created_at    = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    parent   = relationship("Category", remote_side="Category.id", back_populates="children")
    children = relationship("Category", back_populates="parent")
    products = relationship("Product", back_populates="category_rel", lazy="dynamic")

    def __repr__(self):
        return f"<Category {self.name}>"


class Product(Base):
    __tablename__ = "products"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    seller_id   = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True, index=True)
    category    = Column(Enum(ProductCategory), nullable=False, index=True)

    # Core Info
    title             = Column(String(255), nullable=False, index=True)
    slug              = Column(String(300), unique=True, nullable=False, index=True)
    description       = Column(Text, nullable=True)
    short_description = Column(String(500), nullable=True)
    status            = Column(Enum(ProductStatus), default=ProductStatus.PENDING_REVIEW, nullable=False, index=True)

    # Pricing
    price                  = Column(Float, nullable=False)
    min_price              = Column(Float, nullable=True)
    max_price              = Column(Float, nullable=True)
    currency               = Column(String(10), default="NGN", nullable=False)
    is_negotiable          = Column(Boolean, default=False, nullable=False)
    minimum_order_quantity = Column(Float, default=1.0, nullable=False)
    unit                   = Column(Enum(UnitOfMeasure), default=UnitOfMeasure.KG, nullable=False)
    price_tiers            = Column(JSON, nullable=True)

    # Stock
    quantity_available = Column(Float, nullable=False)
    quantity_unit      = Column(String(50), nullable=True)
    restock_date       = Column(DateTime, nullable=True)

    # Quality — core
    grade           = Column(Enum(ProductGrade), nullable=True)
    is_organic      = Column(Boolean, default=False, nullable=False)
    is_export_ready = Column(Boolean, default=False, nullable=False)
    certifications  = Column(JSON, nullable=True)  # ["NAFDAC", "USDA Organic", "EU", "SGS", "Halal"]

    # Quality — specifications
    weight_per_unit             = Column(Float, nullable=True)  # kg per selling unit
    pickup_location             = Column(String(255), nullable=True)
    moisture_percentage         = Column(Float, nullable=True)
    purity_percentage           = Column(Float, nullable=True)
    foreign_matter_percentage   = Column(Float, nullable=True)
    protein_percentage          = Column(Float, nullable=True)
    oil_content_percentage      = Column(Float, nullable=True)
    broken_grain_percentage     = Column(Float, nullable=True)

    # Quality — documents
    lab_report_url               = Column(String(500), nullable=True)
    inspection_certificate_url   = Column(String(500), nullable=True)

    # Media
    images            = Column(JSON, nullable=True)
    videos            = Column(JSON, nullable=True)
    main_image        = Column(String(500), nullable=True)
    video_url         = Column(String(500), nullable=True)
    specification_pdf = Column(String(500), nullable=True)

    # Delivery
    delivery_options   = Column(JSON, nullable=True)
    delivery_time_days = Column(Integer, nullable=True)

    # Location
    country       = Column(String(100), nullable=True)
    state         = Column(String(100), nullable=True)
    city          = Column(String(100), nullable=True)
    farm_location = Column(String(255), nullable=True)
    latitude      = Column(Float, nullable=True)
    longitude     = Column(Float, nullable=True)

    # Livestock Specific
    breed                  = Column(String(100), nullable=True)
    weight_kg              = Column(Float, nullable=True)
    age_months             = Column(Integer, nullable=True)
    gender                 = Column(String(20), nullable=True)
    vaccination_status     = Column(String(100), nullable=True)
    health_certificate_url = Column(String(500), nullable=True)

    # Crop Specific
    harvest_date       = Column(DateTime, nullable=True)
    packaging          = Column(String(255), nullable=True)
    warehouse_location = Column(String(255), nullable=True)

    # Dairy Specific
    storage_condition   = Column(String(255), nullable=True)
    storage_temperature = Column(String(50), nullable=True)
    production_date     = Column(DateTime, nullable=True)
    expiry_date         = Column(DateTime, nullable=True)
    shelf_life_days     = Column(Integer, nullable=True)

    # Availability
    available_date = Column(DateTime, nullable=True)

    # SEO
    meta_title       = Column(String(255), nullable=True)
    meta_description = Column(String(500), nullable=True)
    tags             = Column(JSON, nullable=True)

    # Stats
    view_count     = Column(Integer, default=0, nullable=False)
    inquiry_count  = Column(Integer, default=0, nullable=False)
    order_count    = Column(Integer, default=0, nullable=False)
    wishlist_count = Column(Integer, default=0, nullable=False)
    rating_average = Column(Float, default=0.0, nullable=False)
    rating_count   = Column(Integer, default=0, nullable=False)

    # Featured
    is_featured    = Column(Boolean, default=False, nullable=False)
    featured_until = Column(DateTime, nullable=True)
    is_sponsored   = Column(Boolean, default=False, nullable=False)
    sponsored_until= Column(DateTime, nullable=True)

    # Admin
    rejection_reason = Column(Text, nullable=True)
    admin_notes      = Column(Text, nullable=True)

    # Timestamps
    created_at   = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    published_at = Column(DateTime, nullable=True)

    # Relationships
    seller       = relationship("User", back_populates="products")
    category_rel = relationship("Category", back_populates="products")
    reviews      = relationship("Review", back_populates="product", lazy="dynamic")
    order_items  = relationship("OrderItem", back_populates="product", lazy="dynamic")
    rfqs         = relationship("RFQ", back_populates="product", lazy="dynamic")
    wishlisted_by= relationship("Wishlist", back_populates="product", lazy="dynamic")

    def __repr__(self):
        return f"<Product {self.title}>"
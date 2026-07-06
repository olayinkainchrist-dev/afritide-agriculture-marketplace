"""
Afritide - Product Schemas
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Any
from datetime import datetime
from uuid import UUID

from app.models.product import ProductCategory, ProductStatus, UnitOfMeasure, ProductGrade


class ProductCreateSchema(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    short_description: Optional[str] = None
    category: ProductCategory
    category_id: Optional[UUID] = None
    price: float = Field(..., gt=0)
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    currency: str = "USD"
    is_negotiable: bool = False
    minimum_order_quantity: float = 1.0
    unit: UnitOfMeasure = UnitOfMeasure.KG
    quantity_available: float = Field(..., gt=0)
    grade: Optional[ProductGrade] = None
    is_organic: bool = False
    is_export_ready: bool = False
    certifications: Optional[List[str]] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    farm_location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    # Livestock
    breed: Optional[str] = None
    weight_kg: Optional[float] = None
    age_months: Optional[int] = None
    gender: Optional[str] = None
    vaccination_status: Optional[str] = None

    # Crops
    moisture_percentage: Optional[float] = None
    harvest_date: Optional[datetime] = None
    packaging: Optional[str] = None
    warehouse_location: Optional[str] = None

    # Dairy
    storage_condition: Optional[str] = None
    storage_temperature: Optional[str] = None
    production_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    shelf_life_days: Optional[int] = None

    delivery_time_days: Optional[int] = None
    tags: Optional[List[str]] = None


class ProductUpdateSchema(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    price: Optional[float] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    currency: Optional[str] = None
    is_negotiable: Optional[bool] = None
    minimum_order_quantity: Optional[float] = None
    unit: Optional[UnitOfMeasure] = None
    quantity_available: Optional[float] = None
    grade: Optional[ProductGrade] = None
    is_organic: Optional[bool] = None
    is_export_ready: Optional[bool] = None
    certifications: Optional[List[str]] = None
    images: Optional[List[str]] = None
    main_image: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    farm_location: Optional[str] = None
    breed: Optional[str] = None
    weight_kg: Optional[float] = None
    age_months: Optional[int] = None
    gender: Optional[str] = None
    vaccination_status: Optional[str] = None
    moisture_percentage: Optional[float] = None
    harvest_date: Optional[datetime] = None
    packaging: Optional[str] = None
    storage_condition: Optional[str] = None
    expiry_date: Optional[datetime] = None
    delivery_time_days: Optional[int] = None
    tags: Optional[List[str]] = None


class ProductResponseSchema(BaseModel):
    id: UUID
    seller_id: UUID
    title: str
    slug: str
    short_description: Optional[str]
    category: ProductCategory
    status: ProductStatus
    price: float
    min_price: Optional[float]
    max_price: Optional[float]
    currency: str
    is_negotiable: bool
    minimum_order_quantity: float
    unit: UnitOfMeasure
    quantity_available: float
    grade: Optional[ProductGrade]
    is_organic: bool
    is_export_ready: bool
    certifications: Optional[List[str]]
    main_image: Optional[str]
    images: Optional[List[str]]
    country: Optional[str]
    state: Optional[str]
    city: Optional[str]
    farm_location: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    view_count: int
    order_count: int
    rating_average: float
    rating_count: int
    wishlist_count: int
    is_featured: bool
    tags: Optional[List[str]]
    delivery_time_days: Optional[int]
    created_at: datetime
    published_at: Optional[datetime]

    # Livestock
    breed: Optional[str]
    weight_kg: Optional[float]
    age_months: Optional[int]
    gender: Optional[str]
    vaccination_status: Optional[str]

    # Crops
    moisture_percentage: Optional[float]
    harvest_date: Optional[datetime]
    packaging: Optional[str]

    # Dairy
    storage_condition: Optional[str]
    expiry_date: Optional[datetime]
    shelf_life_days: Optional[int]

    class Config:
        from_attributes = True


class ProductDetailSchema(ProductResponseSchema):
    description: Optional[str]
    videos: Optional[List[str]]
    specification_pdf: Optional[str]
    seller: Optional[Any] = None

    class Config:
        from_attributes = True
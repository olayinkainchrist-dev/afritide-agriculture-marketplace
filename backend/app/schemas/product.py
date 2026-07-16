"""
Afritide - Product Schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID

from app.models.product import ProductCategory, ProductStatus, UnitOfMeasure, ProductGrade


class ProductCreateSchema(BaseModel):
    title:                    str   = Field(..., min_length=3, max_length=255)
    description:              Optional[str]        = None
    short_description:        Optional[str]        = None
    category:                 ProductCategory
    category_id:              Optional[UUID]       = None
    price:                    float = Field(..., gt=0)
    min_price:                Optional[float]      = None
    max_price:                Optional[float]      = None
    currency:                 str                  = "NGN"
    is_negotiable:            bool                 = False
    minimum_order_quantity:   float                = 1.0
    unit:                     UnitOfMeasure        = UnitOfMeasure.KG
    quantity_available:       float = Field(..., gt=0)
    grade:                    Optional[ProductGrade]   = None
    is_organic:               bool                 = False
    is_export_ready:          bool                 = False
    certifications:           Optional[List[str]]  = None
    country:                  Optional[str]        = None
    state:                    Optional[str]        = None
    city:                     Optional[str]        = None
    farm_location:            Optional[str]        = None
    latitude:                 Optional[float]      = None
    longitude:                Optional[float]      = None
    # Livestock
    breed:                    Optional[str]        = None
    weight_kg:                Optional[float]      = None
    age_months:               Optional[int]        = None
    gender:                   Optional[str]        = None
    vaccination_status:       Optional[str]        = None
    # Crop / Quality specs
    moisture_percentage:      Optional[float]      = None
    purity_percentage:        Optional[float]      = None
    foreign_matter_percentage:Optional[float]      = None
    protein_percentage:       Optional[float]      = None
    oil_content_percentage:   Optional[float]      = None
    broken_grain_percentage:  Optional[float]      = None
    harvest_date:             Optional[datetime]   = None
    packaging:                Optional[str]        = None
    warehouse_location:       Optional[str]        = None
    # Quality documents
    lab_report_url:             Optional[str]      = None
    inspection_certificate_url: Optional[str]      = None
    # Dairy
    storage_condition:        Optional[str]        = None
    storage_temperature:      Optional[str]        = None
    production_date:          Optional[datetime]   = None
    expiry_date:              Optional[datetime]   = None
    shelf_life_days:          Optional[int]        = None
    # Delivery
    delivery_time_days:       Optional[int]        = None
    delivery_options:         Optional[List[str]]  = None
    # Media
    tags:                     Optional[List[str]]  = None
    images:                   Optional[List[str]]  = None
    main_image:               Optional[str]        = None
    video_url:                Optional[str]        = None
    price_tiers:              Optional[List[dict]] = None


class ProductUpdateSchema(BaseModel):
    title:                    Optional[str]            = None
    description:              Optional[str]            = None
    short_description:        Optional[str]            = None
    price:                    Optional[float]          = None
    min_price:                Optional[float]          = None
    max_price:                Optional[float]          = None
    currency:                 Optional[str]            = None
    is_negotiable:            Optional[bool]           = None
    minimum_order_quantity:   Optional[float]          = None
    unit:                     Optional[UnitOfMeasure]  = None
    quantity_available:       Optional[float]          = None
    grade:                    Optional[ProductGrade]   = None
    is_organic:               Optional[bool]           = None
    is_export_ready:          Optional[bool]           = None
    certifications:           Optional[List[str]]      = None
    country:                  Optional[str]            = None
    state:                    Optional[str]            = None
    city:                     Optional[str]            = None
    farm_location:            Optional[str]            = None
    # Livestock
    breed:                    Optional[str]            = None
    weight_kg:                Optional[float]          = None
    age_months:               Optional[int]            = None
    gender:                   Optional[str]            = None
    vaccination_status:       Optional[str]            = None
    # Crop / Quality specs
    moisture_percentage:      Optional[float]          = None
    purity_percentage:        Optional[float]          = None
    foreign_matter_percentage:Optional[float]          = None
    protein_percentage:       Optional[float]          = None
    oil_content_percentage:   Optional[float]          = None
    broken_grain_percentage:  Optional[float]          = None
    harvest_date:             Optional[datetime]       = None
    packaging:                Optional[str]            = None
    warehouse_location:       Optional[str]            = None
    # Quality documents
    lab_report_url:             Optional[str]          = None
    inspection_certificate_url: Optional[str]          = None
    # Dairy
    storage_condition:        Optional[str]            = None
    expiry_date:              Optional[datetime]       = None
    shelf_life_days:          Optional[int]            = None
    # Delivery
    delivery_time_days:       Optional[int]            = None
    delivery_options:         Optional[List[str]]      = None
    # Media
    tags:                     Optional[List[str]]      = None
    images:                   Optional[List[str]]      = None
    main_image:               Optional[str]            = None
    video_url:                Optional[str]            = None
    price_tiers:              Optional[List[dict]]     = None


class SellerSummarySchema(BaseModel):
    id:                  UUID
    first_name:          str
    last_name:           str
    business_name:       Optional[str]  = None
    profile_image:       Optional[str]  = None
    role:                str
    badge:               str
    country:             Optional[str]  = None
    state:               Optional[str]  = None
    city:                Optional[str]  = None
    bio:                 Optional[str]  = None
    rating_average:      float          = 0.0
    rating_count:        int            = 0
    total_sales:         int            = 0
    response_rate:       float          = 0.0
    years_of_experience: Optional[int]  = None
    farm_name:           Optional[str]  = None
    is_featured:         bool           = False
    created_at:          datetime

    class Config:
        from_attributes = True


class ProductResponseSchema(BaseModel):
    id:                       UUID
    seller_id:                UUID
    title:                    str
    slug:                     str
    short_description:        Optional[str]        = None
    category:                 ProductCategory
    status:                   ProductStatus
    price:                    float
    min_price:                Optional[float]      = None
    max_price:                Optional[float]      = None
    currency:                 str
    is_negotiable:            bool
    minimum_order_quantity:   float
    unit:                     UnitOfMeasure
    quantity_available:       float
    grade:                    Optional[ProductGrade]   = None
    is_organic:               bool
    is_export_ready:          bool
    certifications:           Optional[List[str]]  = None
    main_image:               Optional[str]        = None
    images:                   Optional[List[str]]  = None
    country:                  Optional[str]        = None
    state:                    Optional[str]        = None
    city:                     Optional[str]        = None
    farm_location:            Optional[str]        = None
    latitude:                 Optional[float]      = None
    longitude:                Optional[float]      = None
    view_count:               int
    order_count:              int
    rating_average:           float
    rating_count:             int
    wishlist_count:           int
    is_featured:              bool
    tags:                     Optional[List[str]]  = None
    delivery_time_days:       Optional[int]        = None
    delivery_options:         Optional[List[str]]  = None
    video_url:                Optional[str]        = None
    created_at:               datetime
    published_at:             Optional[datetime]   = None
    # Livestock
    breed:                    Optional[str]        = None
    weight_kg:                Optional[float]      = None
    age_months:               Optional[int]        = None
    gender:                   Optional[str]        = None
    vaccination_status:       Optional[str]        = None
    # Crop / Quality specs
    moisture_percentage:      Optional[float]      = None
    purity_percentage:        Optional[float]      = None
    foreign_matter_percentage:Optional[float]      = None
    protein_percentage:       Optional[float]      = None
    oil_content_percentage:   Optional[float]      = None
    broken_grain_percentage:  Optional[float]      = None
    harvest_date:             Optional[datetime]   = None
    packaging:                Optional[str]        = None
    # Quality documents
    lab_report_url:             Optional[str]      = None
    inspection_certificate_url: Optional[str]      = None
    # Dairy
    storage_condition:        Optional[str]        = None
    expiry_date:              Optional[datetime]   = None
    shelf_life_days:          Optional[int]        = None
    price_tiers:              Optional[List[dict]] = None

    class Config:
        from_attributes = True


class ProductDetailSchema(ProductResponseSchema):
    description:       Optional[str]       = None
    videos:            Optional[List[str]] = None
    specification_pdf: Optional[str]       = None
    seller:            Optional[SellerSummarySchema] = None

    class Config:
        from_attributes = True
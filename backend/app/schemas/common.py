"""
Afritide - Order, RFQ, Message, Commodity, Review Schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime
from uuid import UUID

from app.models.order import OrderStatus
from app.models.rfq import RFQStatus
from app.models.commodity import PriceTrend, PriceType
from app.models.payment import PaymentMethod


# ── ORDER SCHEMAS ─────────────────────────────────────────────────────────────

class OrderItemCreateSchema(BaseModel):
    product_id: UUID
    quantity: float = Field(..., gt=0)


class OrderCreateSchema(BaseModel):
    items: List[OrderItemCreateSchema]
    shipping_address: Optional[Dict] = None
    shipping_method: Optional[str] = None
    buyer_notes: Optional[str] = None
    currency: str = "USD"


class OrderUpdateSchema(BaseModel):
    status: Optional[OrderStatus] = None
    tracking_number: Optional[str] = None
    seller_notes: Optional[str] = None
    estimated_delivery: Optional[datetime] = None


class OrderResponseSchema(BaseModel):
    id: UUID
    order_number: str
    buyer_id: UUID
    seller_id: UUID
    status: OrderStatus
    subtotal: float
    shipping_cost: float
    tax_amount: float
    total_amount: float
    currency: str
    tracking_number: Optional[str] = None
    estimated_delivery: Optional[datetime] = None
    buyer_notes: Optional[str] = None
    seller_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── RFQ SCHEMAS ───────────────────────────────────────────────────────────────

class RFQCreateSchema(BaseModel):
    product_id: Optional[UUID] = None
    seller_id: Optional[UUID] = None
    product_name: str = Field(..., min_length=2)
    category: Optional[str] = None
    quantity: float = Field(..., gt=0)
    unit: str
    target_price: Optional[float] = None
    currency: str = "USD"
    delivery_country: Optional[str] = None
    delivery_date: Optional[datetime] = None
    specifications: Optional[str] = None
    additional_requirements: Optional[str] = None


class RFQQuoteSchema(BaseModel):
    quoted_price: float = Field(..., gt=0)
    quoted_quantity: float = Field(..., gt=0)
    quote_valid_until: datetime
    quote_notes: Optional[str] = None


class RFQResponseSchema(BaseModel):
    id: UUID
    rfq_number: str
    buyer_id: UUID
    seller_id: Optional[UUID] = None
    product_name: str
    quantity: float
    unit: str
    target_price: Optional[float] = None
    currency: str
    status: RFQStatus
    quoted_price: Optional[float] = None
    quoted_quantity: Optional[float] = None
    quote_valid_until: Optional[datetime] = None
    quote_notes: Optional[str] = None
    delivery_country: Optional[str] = None
    delivery_date: Optional[datetime] = None
    specifications: Optional[str] = None
    additional_requirements: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── MESSAGE SCHEMAS ───────────────────────────────────────────────────────────

class MessageCreateSchema(BaseModel):
    receiver_id: UUID
    product_id: Optional[UUID] = None
    content: Optional[str] = None
    attachments: Optional[List[Dict]] = None


class MessageResponseSchema(BaseModel):
    id: UUID
    conversation_id: UUID
    sender_id: UUID
    receiver_id: UUID
    content: Optional[str] = None
    attachments: Optional[List[Dict]] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationResponseSchema(BaseModel):
    id: UUID
    participant_1_id: UUID
    participant_2_id: UUID
    product_id: Optional[UUID] = None
    last_message_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── COMMODITY SCHEMAS ─────────────────────────────────────────────────────────

class CommodityCreateSchema(BaseModel):
    commodity_name:    str   = Field(..., min_length=2)
    category:          Optional[str] = None
    price_type:        PriceType = PriceType.WHOLESALE
    price:             float = Field(..., gt=0)
    currency:          str = "USD"
    unit:              str
    market:            Optional[str] = None
    region:            Optional[str] = None
    country:           Optional[str] = None
    is_export_price:   bool = False
    is_domestic_price: bool = True
    source:            Optional[str] = None
    notes:             Optional[str] = None


class CommodityUpdateSchema(BaseModel):
    price:             Optional[float] = None
    price_type:        Optional[PriceType] = None
    currency:          Optional[str] = None
    unit:              Optional[str] = None
    market:            Optional[str] = None
    region:            Optional[str] = None
    country:           Optional[str] = None
    notes:             Optional[str] = None
    is_active:         Optional[bool] = None
    is_export_price:   Optional[bool] = None
    is_domestic_price: Optional[bool] = None


class CommodityResponseSchema(BaseModel):
    id:                UUID
    commodity_name:    str
    category:          Optional[str] = None
    price_type:        Optional[PriceType] = PriceType.WHOLESALE
    price:             float
    previous_price:    Optional[float] = None
    currency:          str
    unit:              str
    trend:             PriceTrend
    change_percentage: Optional[float] = None
    market:            Optional[str] = None
    region:            Optional[str] = None
    country:           Optional[str] = None
    is_export_price:   bool
    is_domestic_price: bool
    is_active:         bool
    source:            Optional[str] = None
    notes:             Optional[str] = None
    updated_at:        datetime

    class Config:
        from_attributes = True


# ── REVIEW SCHEMAS ────────────────────────────────────────────────────────────

class ReviewCreateSchema(BaseModel):
    product_id:           Optional[UUID] = None
    reviewee_id:          Optional[UUID] = None
    order_id:             Optional[UUID] = None
    overall_rating:       float = Field(..., ge=1, le=5)
    quality_rating:       Optional[float] = Field(None, ge=1, le=5)
    delivery_rating:      Optional[float] = Field(None, ge=1, le=5)
    communication_rating: Optional[float] = Field(None, ge=1, le=5)
    packaging_rating:     Optional[float] = Field(None, ge=1, le=5)
    title:                Optional[str] = None
    comment:              Optional[str] = None


class ReviewResponseSchema(BaseModel):
    id:                   UUID
    reviewer_id:          UUID
    reviewee_id:          Optional[UUID] = None
    product_id:           Optional[UUID] = None
    overall_rating:       float
    quality_rating:       Optional[float] = None
    delivery_rating:      Optional[float] = None
    communication_rating: Optional[float] = None
    title:                Optional[str] = None
    comment:              Optional[str] = None
    is_verified_purchase: bool
    seller_reply:         Optional[str] = None
    created_at:           datetime

    class Config:
        from_attributes = True


# ── NOTIFICATION SCHEMAS ──────────────────────────────────────────────────────

class NotificationResponseSchema(BaseModel):
    id:         UUID
    type:       str
    title:      str
    message:    str
    is_read:    bool
    action_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── CERTIFICATE SCHEMAS ───────────────────────────────────────────────────────

class CertificateResponseSchema(BaseModel):
    id:             UUID
    user_id:        UUID
    type:           str
    document_url:   Optional[str] = None
    notes:          Optional[str] = None
    status:         str
    created_at:     datetime

    class Config:
        from_attributes = True
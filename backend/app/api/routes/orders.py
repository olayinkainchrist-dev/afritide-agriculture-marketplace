"""
Afritide - Orders Routes
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional
from datetime import datetime
import uuid

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_pagination, PaginationParams
from app.core.responses import success_response, paginated_response
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product, ProductStatus
from app.schemas.common import OrderCreateSchema, OrderUpdateSchema, OrderResponseSchema

router = APIRouter()


def generate_order_number():
    return f"AFT-{uuid.uuid4().hex[:8].upper()}"


@router.post("", summary="Place a new order")
async def create_order(
    payload: OrderCreateSchema,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Order must have at least one item")

    # Validate all products and group by seller
    seller_id = None
    order_items = []
    subtotal = 0.0

    for item in payload.items:
        product = db.query(Product).filter(
            Product.id == item.product_id,
            Product.status == ProductStatus.ACTIVE,
        ).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        if product.quantity_available < item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.title}")

        if seller_id and product.seller_id != seller_id:
            raise HTTPException(status_code=400, detail="All products must be from the same seller")
        seller_id = product.seller_id

        total_price = product.price * item.quantity
        subtotal += total_price
        order_items.append((product, item.quantity, product.price, total_price))

    order = Order(
        order_number=generate_order_number(),
        buyer_id=current_user.id,
        seller_id=seller_id,
        status=OrderStatus.PENDING,
        subtotal=subtotal,
        total_amount=subtotal,
        currency=payload.currency,
        shipping_address=payload.shipping_address,
        shipping_method=payload.shipping_method,
        buyer_notes=payload.buyer_notes,
    )
    db.add(order)
    db.flush()

    for product, quantity, unit_price, total_price in order_items:
        order_item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=quantity,
            unit=product.unit.value,
            unit_price=unit_price,
            total_price=total_price,
            product_snapshot={"title": product.title, "image": product.main_image},
        )
        db.add(order_item)
        product.quantity_available -= quantity
        product.order_count += 1

    db.commit()
    db.refresh(order)

    return success_response(
        data=OrderResponseSchema.from_orm(order).dict(),
        message="Order placed successfully",
        status_code=201,
    )


@router.get("", summary="Get my orders")
async def get_my_orders(
    role: str = "buyer",
    status: Optional[OrderStatus] = None,
    pagination: PaginationParams = Depends(get_pagination),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if role == "seller":
        query = db.query(Order).filter(Order.seller_id == current_user.id)
    else:
        query = db.query(Order).filter(Order.buyer_id == current_user.id)

    if status:
        query = query.filter(Order.status == status)

    query = query.order_by(desc(Order.created_at))
    total = query.count()
    orders = query.offset(pagination.offset).limit(pagination.page_size).all()

    return paginated_response(
        data=[OrderResponseSchema.from_orm(o).dict() for o in orders],
        total=total, page=pagination.page, page_size=pagination.page_size,
    )


@router.get("/{order_id}", summary="Get order details")
async def get_order(
    order_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.buyer_id != current_user.id and order.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    data = OrderResponseSchema.from_orm(order).dict()
    data["items"] = [
        {
            "product_id": str(i.product_id),
            "quantity": i.quantity,
            "unit": i.unit,
            "unit_price": i.unit_price,
            "total_price": i.total_price,
            "product_snapshot": i.product_snapshot,
        }
        for i in order.items
    ]
    return success_response(data=data)


@router.put("/{order_id}/status", summary="Update order status (seller)")
async def update_order_status(
    order_id: uuid.UUID,
    payload: OrderUpdateSchema,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.seller_id != current_user.id:
        from app.models.user import UserRole
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Access denied")

    if payload.status:
        order.status = payload.status
        if payload.status == OrderStatus.CONFIRMED:
            order.confirmed_at = datetime.utcnow()
        elif payload.status == OrderStatus.SHIPPED:
            order.shipped_at = datetime.utcnow()
        elif payload.status == OrderStatus.COMPLETED:
            order.completed_at = datetime.utcnow()
        elif payload.status == OrderStatus.CANCELLED:
            order.cancelled_at = datetime.utcnow()

    if payload.tracking_number:
        order.tracking_number = payload.tracking_number
    if payload.seller_notes:
        order.seller_notes = payload.seller_notes
    if payload.estimated_delivery:
        order.estimated_delivery = payload.estimated_delivery

    db.commit()
    db.refresh(order)

    return success_response(
        data=OrderResponseSchema.from_orm(order).dict(),
        message="Order updated successfully",
    )

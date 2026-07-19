"""
Afritide - Paystack Payment Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import httpx
import uuid
import os

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.responses import success_response
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.cart import Cart, CartItem
from app.models.user import User
from app.models.notification import Notification, NotificationType
from app.services.email import send_order_confirmation_email, send_new_order_email
from pydantic import BaseModel
from typing import List, Optional, Dict

router = APIRouter()

PAYSTACK_SECRET_KEY = os.getenv("PAYSTACK_SECRET_KEY", "")
PLATFORM_FEE        = float(os.getenv("PLATFORM_FEE_PERCENTAGE", "5")) / 100


class CartItemPayload(BaseModel):
    id:         str
    product_id: str
    title:      str
    price:      float
    currency:   str
    unit:       str
    quantity:   float
    item_total: float
    seller_id:  str


class VerifyPaymentPayload(BaseModel):
    reference:        str
    cart_items:       List[CartItemPayload]
    shipping_address: Dict
    shipping_method:  str
    shipment_type:      Optional[str] = None
    logistics_provider: Optional[str] = None
    buyer_notes:      Optional[str] = None


@router.post("/paystack/verify", summary="Verify Paystack payment and create order")
async def verify_paystack_payment(
    payload:      VerifyPaymentPayload,
    current_user= Depends(get_current_user),
    db:           Session = Depends(get_db),
):
    # Step 1 — Verify payment with Paystack
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"https://api.paystack.co/transaction/verify/{payload.reference}",
            headers={"Authorization": f"Bearer {PAYSTACK_SECRET_KEY}"},
        )

    if res.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to verify payment with Paystack")

    data = res.json()

    if data.get("data", {}).get("status") != "success":
        raise HTTPException(status_code=400, detail="Payment not successful")

    amount_paid = data["data"]["amount"] / 100

    # Step 2 — Create order per seller
    seller_groups: Dict[str, list] = {}
    for item in payload.cart_items:
        if item.seller_id not in seller_groups:
            seller_groups[item.seller_id] = []
        seller_groups[item.seller_id].append(item)

    created_orders = []

    for seller_id, seller_items in seller_groups.items():
        subtotal      = sum(i.item_total for i in seller_items)
        platform_fee  = subtotal * PLATFORM_FEE
        total         = subtotal

        order_number = f"AFR-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"

        order = Order(
            order_number=      order_number,
            buyer_id=          current_user.id,
            seller_id=         uuid.UUID(seller_id),
            status=            OrderStatus.CONFIRMED,
            subtotal=          subtotal,
            shipping_cost=     0.0,
            tax_amount=        0.0,
            platform_fee=      platform_fee,
            total_amount=      total,
            currency=          seller_items[0].currency,
            shipping_address=  payload.shipping_address,
            shipping_method=   payload.shipping_method,
            shipment_type=     payload.shipment_type,
            logistics_provider=payload.logistics_provider,
            buyer_notes=       payload.buyer_notes,
            payment_method=    "paystack",
            payment_reference= payload.reference,
            payment_currency=  "NGN",
            payment_amount=    amount_paid,
            exchange_rate=     1.0,
            paid_at=           datetime.utcnow(),
        )
        db.add(order)
        db.flush()

        for item in seller_items:
            order_item = OrderItem(
                order_id=   order.id,
                product_id= uuid.UUID(item.product_id),
                quantity=   item.quantity,
                unit_price= item.price,
                total_price=item.item_total,
                unit=       item.unit,
            )
            db.add(order_item)

            product = db.query(Product).filter(Product.id == uuid.UUID(item.product_id)).first()
            if product:
                product.quantity_available = max(0, product.quantity_available - item.quantity)
                product.order_count        = (product.order_count or 0) + 1

        created_orders.append((order, seller_id, seller_items, subtotal))

    # Commit orders first — isolated from notifications
    db.commit()

    # Step 3 — Clear cart
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if cart:
        db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
        db.commit()

    # Step 4 — Notify sellers — separate transaction, never blocks order
    for order, seller_id, seller_items, subtotal in created_orders:
        try:
            db.add(Notification(
                user_id= uuid.UUID(seller_id),
                type=    NotificationType.NEW_ORDER,
                title=   "New Order Received 🛒",
                message= f"You have a new order {order.order_number} for {seller_items[0].currency} {subtotal:,.0f}. Please confirm it.",
            ))
            db.commit()
        except Exception:
            db.rollback()

    # Step 5 — Email buyer confirmation
    try:
        send_order_confirmation_email(
            to_email=     current_user.email,
            first_name=   current_user.first_name,
            order_number= created_orders[0][0].order_number,
            amount=       amount_paid,
            currency=     payload.cart_items[0].currency,
        )
    except Exception:
        pass

    # Step 6 — Email each seller
    for order, seller_id, seller_items, subtotal in created_orders:
        try:
            seller = db.query(User).filter(User.id == uuid.UUID(seller_id)).first()
            if seller:
                send_new_order_email(
                    to_email=     seller.email,
                    first_name=   seller.first_name,
                    order_number= order.order_number,
                    amount=       subtotal,
                    currency=     seller_items[0].currency,
                    item_count=   len(seller_items),
                    buyer_name=   f"{current_user.first_name} {current_user.last_name}",
                )
        except Exception:
            pass

    first_order = created_orders[0][0]
    return success_response(
        data={
            "order_id":     str(first_order.id),
            "order_number": first_order.order_number,
            "amount_paid":  amount_paid,
            "orders_count": len(created_orders),
        },
        message="Payment verified and order created successfully",
    )
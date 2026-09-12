"""
Afritide - Paystack Payment Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
import httpx
import uuid
import os
import logging

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
logger = logging.getLogger(__name__)

PAYSTACK_SECRET_KEY = os.getenv("PAYSTACK_SECRET_KEY", "")


def get_commission_rate_direct(seller_role: str, amount: Decimal, db: Session):
    """Direct SQL commission lookup."""
    result = db.execute(text("""
        SELECT name, rate_percentage, id::text
        FROM seller_commission_rules
        WHERE is_active = true
          AND (effective_until IS NULL OR effective_until >= NOW())
          AND (min_amount IS NULL OR min_amount <= :amount)
          AND (max_amount IS NULL OR max_amount >= :amount)
          AND (seller_type IS NULL OR seller_type = :role)
        ORDER BY priority DESC
        LIMIT 1
    """), {"role": seller_role, "amount": float(amount)}).fetchone()

    if result:
        return Decimal(str(result[1])), result[0], result[2]
    return Decimal("5.00"), "Standard Marketplace Rate", None


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
    reference:          str
    cart_items:         List[CartItemPayload]
    shipping_address:   Dict
    shipping_method:    str
    shipment_type:      Optional[str] = None
    logistics_provider: Optional[str] = None
    buyer_notes:        Optional[str] = None


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
        subtotal = sum(i.item_total for i in seller_items)
        currency = seller_items[0].currency

        # Get seller role for commission
        seller = db.query(User).filter(User.id == uuid.UUID(seller_id)).first()
        seller_role = str(seller.role.value).strip().upper() if seller else "FARMER"

        # Calculate commission
        subtotal_dec      = Decimal(str(subtotal))
        commission_amount = Decimal("0")
        net_amount        = subtotal_dec
        rate              = Decimal("0")

        try:
            rate, rule_name, rule_id = get_commission_rate_direct(seller_role, subtotal_dec, db)
            logger.info(f"Paystack commission: seller_role={seller_role}, rate={rate}%, rule={rule_name}")
            commission_amount = (subtotal_dec * rate / Decimal("100")).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            net_amount = subtotal_dec - commission_amount
        except Exception as e:
            logger.error(f"Commission calculation error: {e}")

        order_number = f"AFR-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"

        order = Order(
            order_number=       order_number,
            buyer_id=           current_user.id,
            seller_id=          uuid.UUID(seller_id),
            status=             OrderStatus.CONFIRMED,
            subtotal=           subtotal,
            shipping_cost=      0.0,
            tax_amount=         0.0,
            platform_fee=       float(commission_amount),
            total_amount=       subtotal,
            currency=           currency,
            shipping_address=   payload.shipping_address,
            shipping_method=    payload.shipping_method,
            shipment_type=      payload.shipment_type,
            logistics_provider= payload.logistics_provider,
            buyer_notes=        payload.buyer_notes,
            payment_method=     "paystack",
            payment_reference=  payload.reference,
            payment_currency=   "NGN",
            payment_amount=     amount_paid,
            exchange_rate=      1.0,
            paid_at=            datetime.utcnow(),
        )
        db.add(order)
        db.flush()

        for item in seller_items:
            order_item = OrderItem(
                order_id=    order.id,
                product_id=  uuid.UUID(item.product_id),
                quantity=    item.quantity,
                unit_price=  item.price,
                total_price= item.item_total,
                unit=        item.unit,
            )
            db.add(order_item)

            product = db.query(Product).filter(Product.id == uuid.UUID(item.product_id)).first()
            if product:
                product.quantity_available = max(0, product.quantity_available - item.quantity)
                product.order_count        = (product.order_count or 0) + 1

        created_orders.append((order, seller_id, seller_items, subtotal, rate, commission_amount, net_amount, currency))

    db.commit()

    # Record commission after commit
    for order, seller_id, seller_items, subtotal, rate, commission_amount, net_amount, currency in created_orders:
        try:
            db.execute(text("""
                INSERT INTO transaction_fees
                    (id, order_id, seller_id, fee_type, rate_percentage, base_amount, fee_amount, currency)
                VALUES
                    (gen_random_uuid(), :order_id, :seller_id, 'COMMISSION', :rate, :base, :fee, :currency)
            """), {
                "order_id":  str(order.id),
                "seller_id": str(seller_id),
                "rate":      float(rate),
                "base":      float(subtotal),
                "fee":       float(commission_amount),
                "currency":  currency,
            })

            db.execute(text("""
                INSERT INTO seller_payouts
                    (id, seller_id, order_id, gross_amount, commission_rate, commission_amount,
                     logistics_fee, net_amount, currency, payout_status)
                VALUES
                    (gen_random_uuid(), :seller_id, :order_id, :gross, :rate, :commission,
                     0, :net, :currency, 'PENDING')
            """), {
                "seller_id":  str(seller_id),
                "order_id":   str(order.id),
                "gross":      float(subtotal),
                "rate":       float(rate),
                "commission": float(commission_amount),
                "net":        float(net_amount),
                "currency":   currency,
            })
            db.commit()
            logger.info(f"Commission saved for Paystack order {order.id} at {float(rate)}%")
        except Exception as e:
            logger.error(f"Commission insert failed for Paystack order {order.id}: {e}")

    # Step 3 — Clear cart
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if cart:
        db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
        db.commit()

    # Step 4 — Notify sellers
    for order, seller_id, seller_items, subtotal, rate, commission_amount, net_amount, currency in created_orders:
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

    # Step 5 — Email buyer
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

    # Step 6 — Email sellers
    for order, seller_id, seller_items, subtotal, rate, commission_amount, net_amount, currency in created_orders:
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
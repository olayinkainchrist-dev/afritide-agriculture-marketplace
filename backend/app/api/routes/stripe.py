"""
Afritide - Stripe Payment Routes
For international buyers paying in USD, GBP, EUR
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
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

STRIPE_SECRET_KEY      = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET  = os.getenv("STRIPE_WEBHOOK_SECRET", "")

SUPPORTED_CURRENCIES = ["USD", "GBP", "EUR", "GHS", "KES", "ZAR"]


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


class CreateStripeSessionPayload(BaseModel):
    cart_items:         List[CartItemPayload]
    shipping_address:   Dict
    shipping_method:    str
    shipment_type:      Optional[str] = None
    logistics_provider: Optional[str] = None
    buyer_notes:        Optional[str] = None
    currency:           str           = "USD"
    success_url:        str
    cancel_url:         str


class VerifyStripePayload(BaseModel):
    session_id:         str
    cart_items:         List[CartItemPayload]
    shipping_address:   Dict
    shipping_method:    str
    shipment_type:      Optional[str] = None
    logistics_provider: Optional[str] = None
    buyer_notes:        Optional[str] = None
    payment_currency:   Optional[str] = None
    exchange_rate:      Optional[float] = None


@router.post("/stripe/create-session", summary="Create Stripe checkout session")
async def create_stripe_session(
    payload:      CreateStripeSessionPayload,
    current_user= Depends(get_current_user),
    db:           Session = Depends(get_db),
):
    try:
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY
    except ImportError:
        raise HTTPException(status_code=500, detail="Stripe not installed")

    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    currency = payload.currency.lower()
    if currency not in [c.lower() for c in SUPPORTED_CURRENCIES]:
        raise HTTPException(status_code=400, detail=f"Currency {payload.currency} not supported by Stripe")

    from app.services.exchange_rate import convert as convert_currency
    base_subtotal = sum(item.item_total for item in payload.cart_items)

    base_currency = payload.cart_items[0].currency if payload.cart_items else "NGN"
    if base_currency != payload.currency:
        subtotal, exchange_rate_used = await convert_currency(base_subtotal, base_currency, payload.currency)
    else:
        subtotal = base_subtotal
        exchange_rate_used = 1.0

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="payment",
            customer_email=current_user.email,
            line_items=[
                {
                    "price_data": {
                        "currency":     currency,
                        "unit_amount":  int(subtotal * 100),
                        "product_data": {
                            "name":        f"Afritide Order — {len(payload.cart_items)} item(s)",
                            "description": ", ".join(i.title for i in payload.cart_items[:3]),
                        },
                    },
                    "quantity": 1,
                }
            ],
            metadata={
                "buyer_id":           str(current_user.id),
                "buyer_email":        current_user.email,
                "shipping_method":    payload.shipping_method,
                "shipment_type":      payload.shipment_type or "",
                "logistics_provider": payload.logistics_provider or "",
                "platform":           "afritide",
                "payment_currency":   payload.currency,
                "exchange_rate":      str(exchange_rate_used),
                "base_currency":      base_currency,
                "base_amount":        str(base_subtotal),
            },
            success_url=payload.success_url + "?session_id={CHECKOUT_SESSION_ID}",
            cancel_url= payload.cancel_url,
        )

        return success_response(data={
            "session_id":       session.id,
            "checkout_url":     session.url,
            "exchange_rate":    exchange_rate_used,
            "converted_amount": subtotal,
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/stripe/verify", summary="Verify Stripe payment and create order")
async def verify_stripe_payment(
    payload:      VerifyStripePayload,
    current_user= Depends(get_current_user),
    db:           Session = Depends(get_db),
):
    try:
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY
    except ImportError:
        raise HTTPException(status_code=500, detail="Stripe not installed")

    try:
        session = stripe.checkout.Session.retrieve(payload.session_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to verify session: {str(e)}")

    if session.payment_status != "paid":
        raise HTTPException(status_code=400, detail="Payment not completed")

    existing_order = db.query(Order).filter(
        Order.payment_reference == payload.session_id
    ).first()
    if existing_order:
        return success_response(
            data={
                "order_id":     str(existing_order.id),
                "order_number": existing_order.order_number,
                "amount_paid":  session.amount_total / 100,
                "orders_count": 1,
            },
            message="Order already created for this payment",
        )

    amount_paid      = session.amount_total / 100
    payment_currency = payload.payment_currency or session.currency.upper()
    exchange_rate    = payload.exchange_rate or 1.0

    # Group items by seller
    seller_groups: Dict[str, list] = {}
    for item in payload.cart_items:
        if item.seller_id not in seller_groups:
            seller_groups[item.seller_id] = []
        seller_groups[item.seller_id].append(item)

    created_orders = []

    for seller_id, seller_items in seller_groups.items():
        subtotal = sum(i.item_total for i in seller_items)
        currency = seller_items[0].currency

        # Get seller role for commission calculation
        seller = db.query(User).filter(User.id == uuid.UUID(seller_id)).first()
        seller_role = str(seller.role.value).strip().upper() if seller else "FARMER"

        # Calculate commission using engine
        subtotal_dec      = Decimal(str(subtotal))
        commission_amount = Decimal("0")
        net_amount        = subtotal_dec
        rate              = Decimal("0")

        try:
            rate, rule_name, rule_id = get_commission_rate_direct(seller_role, subtotal_dec, db)
            logger.info(f"Stripe order commission: seller_role={seller_role}, rate={rate}%, rule={rule_name}")
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
            payment_method=     "stripe",
            payment_reference=  payload.session_id,
            payment_currency=   payment_currency,
            payment_amount=     amount_paid,
            exchange_rate=      exchange_rate,
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

    # Record commission for each order after commit
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
            logger.info(f"Commission saved for Stripe order {order.id} at {float(rate)}%")
        except Exception as e:
            logger.error(f"Commission insert failed for Stripe order {order.id}: {e}")

    # Clear cart
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if cart:
        db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
        db.commit()

    # Notify sellers
    for order, seller_id, seller_items, subtotal, rate, commission_amount, net_amount, currency in created_orders:
        try:
            db.add(Notification(
                user_id= uuid.UUID(seller_id),
                type=    NotificationType.NEW_ORDER,
                title=   "New Order Received 🛒",
                message= f"New order {order.order_number} for {seller_items[0].currency} {subtotal:,.0f}.",
            ))
            db.commit()
        except Exception:
            db.rollback()

    # Email buyer
    try:
        send_order_confirmation_email(
            to_email=    current_user.email,
            first_name=  current_user.first_name,
            order_number=created_orders[0][0].order_number,
            amount=      amount_paid,
            currency=    payment_currency,
        )
    except Exception:
        pass

    # Email sellers
    for order, seller_id, seller_items, subtotal, rate, commission_amount, net_amount, currency in created_orders:
        try:
            seller = db.query(User).filter(User.id == uuid.UUID(seller_id)).first()
            if seller:
                send_new_order_email(
                    to_email=    seller.email,
                    first_name=  seller.first_name,
                    order_number=order.order_number,
                    amount=      subtotal,
                    currency=    seller_items[0].currency,
                    item_count=  len(seller_items),
                    buyer_name=  f"{current_user.first_name} {current_user.last_name}",
                )
        except Exception:
            pass

    first_order = created_orders[0][0]
    return success_response(
        data={
            "order_id":         str(first_order.id),
            "order_number":     first_order.order_number,
            "amount_paid":      amount_paid,
            "payment_currency": payment_currency,
            "orders_count":     len(created_orders),
        },
        message="Stripe payment verified and order created successfully",
    )


@router.post("/stripe/webhook", summary="Stripe webhook handler")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events."""
    try:
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY
    except ImportError:
        raise HTTPException(status_code=500, detail="Stripe not installed")

    payload    = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        pass

    return {"status": "ok"}
"""
Afritide - Stripe Payment Routes
For international buyers paying in USD, GBP, EUR
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime
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

STRIPE_SECRET_KEY      = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET  = os.getenv("STRIPE_WEBHOOK_SECRET", "")
PLATFORM_FEE           = float(os.getenv("PLATFORM_FEE_PERCENTAGE", "5")) / 100

SUPPORTED_CURRENCIES = ["USD", "GBP", "EUR", "GHS", "KES", "ZAR"]


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

    subtotal = sum(item.item_total for item in payload.cart_items)

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
                "buyer_id":          str(current_user.id),
                "buyer_email":       current_user.email,
                "shipping_method":   payload.shipping_method,
                "shipment_type":     payload.shipment_type or "",
                "logistics_provider":payload.logistics_provider or "",
                "platform":          "afritide",
            },
            success_url=payload.success_url + "?session_id={CHECKOUT_SESSION_ID}",
            cancel_url= payload.cancel_url,
        )
        return success_response(data={
            "session_id":  session.id,
            "checkout_url":session.url,
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

    # Verify session with Stripe
    try:
        session = stripe.checkout.Session.retrieve(payload.session_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to verify session: {str(e)}")

    if session.payment_status != "paid":
        raise HTTPException(status_code=400, detail="Payment not completed")

    amount_paid = session.amount_total / 100

    # Group items by seller
    seller_groups: Dict[str, list] = {}
    for item in payload.cart_items:
        if item.seller_id not in seller_groups:
            seller_groups[item.seller_id] = []
        seller_groups[item.seller_id].append(item)

    created_orders = []

    for seller_id, seller_items in seller_groups.items():
        subtotal     = sum(i.item_total for i in seller_items)
        platform_fee = subtotal * PLATFORM_FEE
        currency     = seller_items[0].currency

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
            total_amount=      subtotal,
            currency=          currency,
            shipping_address=  payload.shipping_address,
            shipping_method=   payload.shipping_method,
            shipment_type=     payload.shipment_type,
            logistics_provider=payload.logistics_provider,
            buyer_notes=       payload.buyer_notes,
            payment_method=    "stripe",
            payment_reference= payload.session_id,
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

    db.commit()

    # Clear cart
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if cart:
        db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
        db.commit()

    # Notify sellers
    for order, seller_id, seller_items, subtotal in created_orders:
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
            currency=    payload.cart_items[0].currency,
        )
    except Exception:
        pass

    # Email sellers
    for order, seller_id, seller_items, subtotal in created_orders:
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
            "order_id":     str(first_order.id),
            "order_number": first_order.order_number,
            "amount_paid":  amount_paid,
            "orders_count": len(created_orders),
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

    # Log event type — extend as needed
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        # Order already created via /verify endpoint
        # This webhook is a backup confirmation
        pass

    return {"status": "ok"}
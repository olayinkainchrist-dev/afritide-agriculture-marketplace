"""
Afritide - Subscription Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import httpx
import os
import uuid

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.responses import success_response
from app.models.user import User
from app.models.subscription import Subscription, PLAN_FEATURES
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

PAYSTACK_SECRET_KEY = os.getenv("PAYSTACK_SECRET_KEY", "")


class SubscribePayload(BaseModel):
    plan:          str
    billing_cycle: str  # monthly / annual
    currency:      str = "NGN"
    reference:     str


@router.get("/plans", summary="Get all subscription plans")
async def get_plans():
    return success_response(data=PLAN_FEATURES)


@router.get("/my-subscription", summary="Get current subscription")
async def get_my_subscription(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = db.query(Subscription).filter(
        Subscription.user_id == current_user.id,
        Subscription.status  == "active",
    ).order_by(Subscription.created_at.desc()).first()

    return success_response(data={
        "plan":               current_user.subscription_plan,
        "expires_at":         current_user.subscription_expires,
        "max_listings":       current_user.max_listings,
        "listing_count":      current_user.listing_count,
        "is_featured":        current_user.is_featured,
        "features":           PLAN_FEATURES.get(current_user.subscription_plan, PLAN_FEATURES["free"]),
        "active_subscription":sub.id if sub else None,
    })


@router.post("/verify", summary="Verify subscription payment and activate plan")
async def verify_subscription(
    payload:      SubscribePayload,
    current_user= Depends(get_current_user),
    db:           Session = Depends(get_db),
):
    if payload.plan not in PLAN_FEATURES:
        raise HTTPException(status_code=400, detail="Invalid plan")

    if payload.billing_cycle not in ["monthly", "annual"]:
        raise HTTPException(status_code=400, detail="Invalid billing cycle")

    # Verify payment
    if payload.currency == "NGN":
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"https://api.paystack.co/transaction/verify/{payload.reference}",
                headers={"Authorization": f"Bearer {PAYSTACK_SECRET_KEY}"},
            )
        if res.status_code != 200 or res.json().get("data", {}).get("status") != "success":
            raise HTTPException(status_code=400, detail="Payment verification failed")
        amount_paid = res.json()["data"]["amount"] / 100
    else:
        # Stripe verification
        try:
            import stripe
            stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
            session = stripe.checkout.Session.retrieve(payload.reference)
            if session.payment_status != "paid":
                raise HTTPException(status_code=400, detail="Payment not completed")
            amount_paid = session.amount_total / 100
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    # Calculate expiry
    days = 365 if payload.billing_cycle == "annual" else 30
    expires_at = datetime.utcnow() + timedelta(days=days)

    # Update user
    features = PLAN_FEATURES[payload.plan]
    current_user.subscription_plan       = payload.plan
    current_user.subscription_expires    = expires_at
    current_user.subscription_started_at = datetime.utcnow()
    current_user.max_listings            = features["max_listings"]
    if payload.plan in ["pro", "business"]:
        current_user.is_featured     = True
        current_user.featured_until  = expires_at

    # Cancel old subscriptions
    db.query(Subscription).filter(
        Subscription.user_id == current_user.id,
        Subscription.status  == "active",
    ).update({"status": "cancelled", "cancelled_at": datetime.utcnow()})

    # Create new subscription record
    sub = Subscription(
        user_id=          current_user.id,
        plan=             payload.plan,
        billing_cycle=    payload.billing_cycle,
        status=           "active",
        amount_paid=      amount_paid,
        currency=         payload.currency,
        payment_method=   "paystack" if payload.currency == "NGN" else "stripe",
        payment_reference=payload.reference,
        started_at=       datetime.utcnow(),
        expires_at=       expires_at,
    )
    db.add(sub)
    db.commit()

    return success_response(
        data={
            "plan":       payload.plan,
            "expires_at": expires_at,
            "features":   features,
        },
        message=f"Successfully upgraded to {payload.plan.title()} plan!",
    )


@router.post("/cancel", summary="Cancel subscription")
async def cancel_subscription(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(Subscription).filter(
        Subscription.user_id == current_user.id,
        Subscription.status  == "active",
    ).update({"status": "cancelled", "cancelled_at": datetime.utcnow()})

    current_user.subscription_plan    = "free"
    current_user.subscription_expires = None
    current_user.max_listings         = 5
    current_user.is_featured          = False
    current_user.featured_until       = None
    db.commit()

    return success_response(message="Subscription cancelled. You are now on the free plan.")
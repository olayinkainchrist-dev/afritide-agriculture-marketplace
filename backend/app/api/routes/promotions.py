"""
Afritide - Promoted Listings Routes
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
from app.models.product import Product
from app.models.user import User
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

PAYSTACK_SECRET_KEY = os.getenv("PAYSTACK_SECRET_KEY", "")

PROMOTION_PACKAGES = {
    "7days": {
        "label":       "7 Day Boost",
        "days":        7,
        "price_ngn":   2000,
        "price_usd":   5,
        "description": "Your product appears at the top of search results for 7 days",
    },
    "14days": {
        "label":       "14 Day Boost",
        "days":        14,
        "price_ngn":   3500,
        "price_usd":   8,
        "description": "Your product appears at the top of search results for 14 days",
    },
    "30days": {
        "label":       "30 Day Boost",
        "days":        30,
        "price_ngn":   6000,
        "price_usd":   15,
        "description": "Your product appears at the top of search results for 30 days",
    },
}


class PromoteProductPayload(BaseModel):
    product_id: str
    package:    str  # 7days, 14days, 30days
    currency:   str  = "NGN"
    reference:  str


@router.get("/packages", summary="Get promotion packages")
async def get_packages():
    return success_response(data=PROMOTION_PACKAGES)


@router.post("/promote", summary="Pay and promote a product")
async def promote_product(
    payload:      PromoteProductPayload,
    current_user= Depends(get_current_user),
    db:           Session = Depends(get_db),
):
    if payload.package not in PROMOTION_PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid promotion package")

    product = db.query(Product).filter(
        Product.id      == uuid.UUID(payload.product_id),
        Product.seller_id == current_user.id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    package = PROMOTION_PACKAGES[payload.package]

    # Verify payment
    if payload.currency == "NGN":
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"https://api.paystack.co/transaction/verify/{payload.reference}",
                headers={"Authorization": f"Bearer {PAYSTACK_SECRET_KEY}"},
            )
        if res.status_code != 200 or res.json().get("data", {}).get("status") != "success":
            raise HTTPException(status_code=400, detail="Payment verification failed")
    else:
        try:
            import stripe
            stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
            session = stripe.checkout.Session.retrieve(payload.reference)
            if session.payment_status != "paid":
                raise HTTPException(status_code=400, detail="Payment not completed")
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    # Activate promotion
    now = datetime.utcnow()
    if product.sponsored_until and product.sponsored_until > now:
        # Extend existing promotion
        product.sponsored_until = product.sponsored_until + timedelta(days=package["days"])
    else:
        product.sponsored_until = now + timedelta(days=package["days"])

    product.is_sponsored = True
    db.commit()

    return success_response(
        data={
            "product_id":     str(product.id),
            "product_title":  product.title,
            "sponsored_until":product.sponsored_until,
            "package":        package["label"],
        },
        message=f"Product promoted for {package['days']} days!",
    )


@router.get("/my-promotions", summary="Get seller's promoted products")
async def get_my_promotions(
    current_user= Depends(get_current_user),
    db:           Session = Depends(get_db),
):
    now = datetime.utcnow()
    products = db.query(Product).filter(
        Product.seller_id    == current_user.id,
        Product.is_sponsored == True,
    ).all()

    return success_response(data=[{
        "id":             str(p.id),
        "title":          p.title,
        "main_image":     p.main_image,
        "is_sponsored":   p.is_sponsored,
        "sponsored_until":p.sponsored_until,
        "is_active":      p.sponsored_until > now if p.sponsored_until else False,
    } for p in products])
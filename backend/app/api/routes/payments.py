"""
Afritide - Payments Routes
Folder: backend/app/api/routes/payments.py
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_admin_user
from app.core.responses import success_response
from app.models.payment import Payment, PaymentStatus, PaymentMethod
from app.models.order import Order

router = APIRouter()


@router.post("/initiate", summary="Initiate payment for an order")
async def initiate_payment(
    order_id: uuid.UUID,
    method: PaymentMethod,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(Order.id == order_id, Order.buyer_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    existing = db.query(Payment).filter(Payment.order_id == order_id).first()
    if existing and existing.status == PaymentStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Order already paid")

    payment = existing or Payment(
        order_id=order.id,
        payer_id=current_user.id,
        amount=order.total_amount,
        currency=order.currency,
        method=method,
        status=PaymentStatus.PENDING,
    )
    if not existing:
        db.add(payment)
    db.commit()
    db.refresh(payment)

    # NOTE: Actual gateway integration (Paystack/Flutterwave/Stripe) happens
    # in Phase 2. This returns a payment reference that the frontend will use
    # to redirect to the gateway checkout page.
    return success_response(
        data={
            "payment_id": str(payment.id),
            "amount": payment.amount,
            "currency": payment.currency,
            "method": payment.method,
            "status": payment.status,
            "reference": f"AFT-PAY-{payment.id.hex[:10].upper()}",
        },
        message="Payment initiated. Complete payment via the selected gateway.",
    )


@router.post("/{payment_id}/confirm", summary="Confirm payment (webhook/admin)")
async def confirm_payment(
    payment_id: uuid.UUID,
    gateway_reference: str,
    current_user=Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    payment.status = PaymentStatus.COMPLETED
    payment.gateway_reference = gateway_reference
    payment.paid_at = datetime.utcnow()
    db.commit()

    return success_response(message="Payment confirmed")


@router.get("/order/{order_id}", summary="Get payment for an order")
async def get_payment_for_order(
    order_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payment = db.query(Payment).filter(Payment.order_id == order_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="No payment found for this order")
    if payment.payer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return success_response(data={
        "id": str(payment.id), "amount": payment.amount, "currency": payment.currency,
        "method": payment.method, "status": payment.status, "paid_at": payment.paid_at,
    })

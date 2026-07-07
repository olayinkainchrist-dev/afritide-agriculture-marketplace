"""
Afritide - Request for Quotation (RFQ) Routes
Folder: backend/app/api/routes/rfqs.py
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from datetime import datetime
import uuid

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_pagination, PaginationParams
from app.core.responses import success_response, paginated_response
from app.models.rfq import RFQ, RFQStatus
from app.schemas.common import RFQCreateSchema, RFQQuoteSchema, RFQResponseSchema

router = APIRouter()


def generate_rfq_number():
    return f"RFQ-{uuid.uuid4().hex[:8].upper()}"


@router.post("", summary="Create a Request for Quotation")
async def create_rfq(
    payload: RFQCreateSchema,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rfq = RFQ(
        rfq_number=generate_rfq_number(),
        buyer_id=current_user.id,
        seller_id=payload.seller_id,
        product_id=payload.product_id,
        product_name=payload.product_name,
        category=payload.category,
        quantity=payload.quantity,
        unit=payload.unit,
        target_price=payload.target_price,
        currency=payload.currency,
        delivery_country=payload.delivery_country,
        delivery_date=payload.delivery_date,
        specifications=payload.specifications,
        additional_requirements=payload.additional_requirements,
        status=RFQStatus.OPEN,
    )
    db.add(rfq)
    db.commit()
    db.refresh(rfq)

    return success_response(
        data=RFQResponseSchema.model_validate(rfq).model_dump(mode="json"),
        message="RFQ submitted successfully",
        status_code=201,
    )


@router.get("", summary="Get my RFQs")
async def get_my_rfqs(
    role: str = "buyer",
    status: RFQStatus = None,
    pagination: PaginationParams = Depends(get_pagination),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if role == "seller":
        query = db.query(RFQ).filter(
            or_(RFQ.seller_id == current_user.id, RFQ.seller_id.is_(None))
        )
    else:
        query = db.query(RFQ).filter(RFQ.buyer_id == current_user.id)

    if status:
        query = query.filter(RFQ.status == status)

    query = query.order_by(desc(RFQ.created_at))
    total = query.count()
    rfqs = query.offset(pagination.offset).limit(pagination.page_size).all()

    return paginated_response(
        data=[RFQResponseSchema.model_validate(r).model_dump(mode="json") for r in rfqs],
        total=total, page=pagination.page, page_size=pagination.page_size,
    )


@router.get("/{rfq_id}", summary="Get RFQ details")
async def get_rfq(
    rfq_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    if rfq.buyer_id != current_user.id and rfq.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return success_response(
        data=RFQResponseSchema.model_validate(rfq).model_dump(mode="json")
    )


@router.post("/{rfq_id}/quote", summary="Submit a quotation (seller)")
async def submit_quote(
    rfq_id: uuid.UUID,
    payload: RFQQuoteSchema,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    if rfq.status != RFQStatus.OPEN:
        raise HTTPException(status_code=400, detail="RFQ is no longer open for quotes")

    rfq.seller_id = current_user.id
    rfq.quoted_price = payload.quoted_price
    rfq.quoted_quantity = payload.quoted_quantity
    rfq.quote_valid_until = payload.quote_valid_until
    rfq.quote_notes = payload.quote_notes
    rfq.status = RFQStatus.QUOTED
    db.commit()
    db.refresh(rfq)

    return success_response(
        data=RFQResponseSchema.model_validate(rfq).model_dump(mode="json"),
        message="Quotation submitted successfully",
    )


@router.post("/{rfq_id}/accept", summary="Accept a quotation (buyer)")
async def accept_quote(
    rfq_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rfq = db.query(RFQ).filter(
        RFQ.id == rfq_id, RFQ.buyer_id == current_user.id
    ).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    if rfq.status != RFQStatus.QUOTED:
        raise HTTPException(status_code=400, detail="No quote available to accept")

    rfq.status = RFQStatus.ACCEPTED
    rfq.accepted_at = datetime.utcnow()
    db.commit()

    return success_response(message="Quotation accepted. You can now proceed to checkout.")


@router.post("/{rfq_id}/reject", summary="Reject a quotation (buyer)")
async def reject_quote(
    rfq_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rfq = db.query(RFQ).filter(
        RFQ.id == rfq_id, RFQ.buyer_id == current_user.id
    ).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    rfq.status = RFQStatus.REJECTED
    db.commit()

    return success_response(message="Quotation rejected")
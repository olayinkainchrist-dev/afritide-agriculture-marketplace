"""
Afritide - Commodity Price Board Routes
Folder: backend/app/api/routes/commodities.py
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from typing import Optional
from datetime import datetime
import uuid

from app.core.database import get_db
from app.core.dependencies import get_admin_user, get_pagination, PaginationParams
from app.core.responses import success_response, paginated_response
from app.models.commodity import CommodityPrice, CommodityPriceHistory, PriceTrend
from app.schemas.common import CommodityCreateSchema, CommodityUpdateSchema, CommodityResponseSchema

router = APIRouter()


@router.get("", summary="Get live commodity price board")
async def get_commodity_board(
    category: Optional[str] = None,
    country: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = Query(default="commodity_name", enum=["commodity_name", "price", "change_percentage"]),
    pagination: PaginationParams = Depends(get_pagination),
    db: Session = Depends(get_db),
):
    query = db.query(CommodityPrice).filter(CommodityPrice.is_active == True)

    if category:
        query = query.filter(CommodityPrice.category == category)
    if country:
        query = query.filter(CommodityPrice.country == country)
    if search:
        query = query.filter(CommodityPrice.commodity_name.ilike(f"%{search}%"))

    sort_col = {
        "commodity_name": CommodityPrice.commodity_name,
        "price": CommodityPrice.price,
        "change_percentage": CommodityPrice.change_percentage,
    }.get(sort_by, CommodityPrice.commodity_name)
    query = query.order_by(asc(sort_col))

    total = query.count()
    commodities = query.offset(pagination.offset).limit(pagination.page_size).all()

    return paginated_response(
        data=[CommodityResponseSchema.from_orm(c).dict() for c in commodities],
        total=total, page=pagination.page, page_size=pagination.page_size,
    )


@router.get("/{commodity_id}/history", summary="Get historical prices for a commodity")
async def get_commodity_history(
    commodity_id: uuid.UUID,
    days: int = Query(default=30, le=365),
    db: Session = Depends(get_db),
):
    commodity = db.query(CommodityPrice).filter(CommodityPrice.id == commodity_id).first()
    if not commodity:
        raise HTTPException(status_code=404, detail="Commodity not found")

    history = commodity.price_history.order_by(desc(CommodityPriceHistory.recorded_at)).limit(days).all()

    return success_response(data={
        "commodity_name": commodity.commodity_name,
        "current_price": commodity.price,
        "history": [
            {"price": h.price, "currency": h.currency, "recorded_at": h.recorded_at}
            for h in reversed(history)
        ],
    })


@router.post("", summary="Add new commodity to price board (admin only)")
async def create_commodity(
    payload: CommodityCreateSchema,
    current_user=Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    commodity = CommodityPrice(**payload.dict(), updated_by=current_user.id)
    db.add(commodity)
    db.commit()
    db.refresh(commodity)

    return success_response(
        data=CommodityResponseSchema.from_orm(commodity).dict(),
        message="Commodity added to price board",
        status_code=201,
    )


@router.put("/{commodity_id}", summary="Update commodity price (admin only)")
async def update_commodity(
    commodity_id: uuid.UUID,
    payload: CommodityUpdateSchema,
    current_user=Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    commodity = db.query(CommodityPrice).filter(CommodityPrice.id == commodity_id).first()
    if not commodity:
        raise HTTPException(status_code=404, detail="Commodity not found")

    # Archive current price to history before updating
    history_entry = CommodityPriceHistory(
        commodity_id=commodity.id,
        price=commodity.price,
        currency=commodity.currency,
    )
    db.add(history_entry)

    if payload.price is not None and payload.price != commodity.price:
        commodity.previous_price = commodity.price
        change = ((payload.price - commodity.price) / commodity.price) * 100 if commodity.price else 0
        commodity.change_percentage = round(change, 2)
        commodity.trend = (
            PriceTrend.UP if change > 0 else PriceTrend.DOWN if change < 0 else PriceTrend.STABLE
        )
        commodity.price = payload.price

    update_data = payload.dict(exclude_unset=True, exclude={"price"})
    for field, value in update_data.items():
        setattr(commodity, field, value)

    commodity.updated_by = current_user.id
    commodity.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(commodity)

    return success_response(
        data=CommodityResponseSchema.from_orm(commodity).dict(),
        message="Commodity price updated",
    )


@router.delete("/{commodity_id}", summary="Remove commodity from board (admin only)")
async def delete_commodity(
    commodity_id: uuid.UUID,
    current_user=Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    commodity = db.query(CommodityPrice).filter(CommodityPrice.id == commodity_id).first()
    if not commodity:
        raise HTTPException(status_code=404, detail="Commodity not found")

    commodity.is_active = False
    db.commit()
    return success_response(message="Commodity removed from price board")

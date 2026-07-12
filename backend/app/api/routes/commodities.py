"""
Afritide - Commodity Price Board Routes
Folder: backend/app/api/routes/commodities.py
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from typing import Optional
from datetime import datetime
import uuid

from app.core.database import get_db
from app.core.dependencies import get_admin_user, get_pagination, PaginationParams
from app.core.responses import success_response, paginated_response
from app.models.commodity import CommodityPrice, CommodityPriceHistory, PriceTrend, PriceType
from app.schemas.common import CommodityCreateSchema, CommodityUpdateSchema, CommodityResponseSchema

router = APIRouter()


@router.get("", summary="Get live commodity price board")
async def get_commodity_board(
    category:   Optional[str] = None,
    country:    Optional[str] = None,
    region:     Optional[str] = None,
    price_type: Optional[str] = None,
    search:     Optional[str] = None,
    sort_by:    str = Query(default="commodity_name", enum=["commodity_name", "price", "change_percentage"]),
    pagination: PaginationParams = Depends(get_pagination),
    db:         Session = Depends(get_db),
):
    query = db.query(CommodityPrice).filter(CommodityPrice.is_active == True)

    if category:
        query = query.filter(CommodityPrice.category == category)
    if country:
        query = query.filter(CommodityPrice.country.ilike(f"%{country}%"))
    if region:
        query = query.filter(CommodityPrice.region.ilike(f"%{region}%"))
    if price_type:
        from app.models.commodity import PriceType
        try:
            pt = PriceType(price_type.upper())
            query = query.filter(CommodityPrice.price_type == pt)
        except ValueError:
            pass
    if search:
        query = query.filter(CommodityPrice.commodity_name.ilike(f"%{search}%"))

    sort_col = {
        "commodity_name":    CommodityPrice.commodity_name,
        "price":             CommodityPrice.price,
        "change_percentage": CommodityPrice.change_percentage,
    }.get(sort_by, CommodityPrice.commodity_name)
    query = query.order_by(asc(sort_col))

    total = query.count()
    commodities = query.offset(pagination.offset).limit(pagination.page_size).all()

    return paginated_response(
        data=[CommodityResponseSchema.model_validate(c).model_dump(mode="json") for c in commodities],
        total=total, page=pagination.page, page_size=pagination.page_size,
    )


@router.get("/by-commodity", summary="Get all price types for a specific commodity")
async def get_commodity_by_name(
    name: str = Query(..., description="Commodity name e.g. Maize"),
    db:   Session = Depends(get_db),
):
    commodities = db.query(CommodityPrice).filter(
        CommodityPrice.commodity_name.ilike(f"%{name}%"),
        CommodityPrice.is_active == True,
    ).order_by(asc(CommodityPrice.price_type)).all()

    if not commodities:
        raise HTTPException(status_code=404, detail="Commodity not found")

    grouped: dict = {}
    for c in commodities:
        pt = c.price_type.value if c.price_type else "wholesale"
        if pt not in grouped:
            grouped[pt] = []
        grouped[pt].append({
            "id":                str(c.id),
            "market":            c.market,
            "region":            c.region,
            "country":           c.country,
            "price":             c.price,
            "currency":          c.currency,
            "unit":              c.unit,
            "trend":             c.trend,
            "change_percentage": c.change_percentage,
            "updated_at":        c.updated_at.isoformat() if c.updated_at else None,
        })

    return success_response(data={
        "commodity_name": commodities[0].commodity_name,
        "category":       commodities[0].category,
        "prices":         grouped,
    })


@router.get("/summary", summary="Get commodity price summary grouped by name")
async def get_commodity_summary(
    db: Session = Depends(get_db),
):
    commodities = db.query(CommodityPrice).filter(
        CommodityPrice.is_active == True
    ).order_by(asc(CommodityPrice.commodity_name)).all()

    grouped: dict = {}
    for c in commodities:
        name = c.commodity_name
        if name not in grouped:
            grouped[name] = {
                "commodity_name": name,
                "category":       c.category,
                "price_count":    0,
                "prices":         [],
            }
        grouped[name]["price_count"] += 1
        grouped[name]["prices"].append({
            "price_type": c.price_type.value if c.price_type else "wholesale",
            "price":      c.price,
            "currency":   c.currency,
            "unit":       c.unit,
            "market":     c.market,
            "region":     c.region,
            "country":    c.country,
            "trend":      c.trend,
        })

    return success_response(data=list(grouped.values()))


@router.get("/{commodity_id}/history", summary="Get historical prices for a commodity")
async def get_commodity_history(
    commodity_id: uuid.UUID,
    days:         int = Query(default=30, le=365),
    db:           Session = Depends(get_db),
):
    commodity = db.query(CommodityPrice).filter(CommodityPrice.id == commodity_id).first()
    if not commodity:
        raise HTTPException(status_code=404, detail="Commodity not found")

    history = commodity.price_history.order_by(
        desc(CommodityPriceHistory.recorded_at)
    ).limit(days).all()

    return success_response(data={
        "commodity_name": commodity.commodity_name,
        "price_type":     commodity.price_type.value if commodity.price_type else "wholesale",
        "market":         commodity.market,
        "region":         commodity.region,
        "current_price":  commodity.price,
        "currency":       commodity.currency,
        "unit":           commodity.unit,
        "history": [
            {
                "price":       h.price,
                "currency":    h.currency,
                "recorded_at": h.recorded_at.isoformat() if h.recorded_at else None,
            }
            for h in reversed(history)
        ],
    })


@router.post("", summary="Add new commodity to price board (admin only)")
async def create_commodity(
    payload:      CommodityCreateSchema,
    current_user= Depends(get_admin_user),
    db:           Session = Depends(get_db),
):
    commodity = CommodityPrice(
        **payload.model_dump(),
        updated_by=current_user.id
    )
    db.add(commodity)
    db.commit()
    db.refresh(commodity)

    return success_response(
        data=CommodityResponseSchema.model_validate(commodity).model_dump(mode="json"),
        message="Commodity added to price board",
        status_code=201,
    )


def _trigger_price_alerts(
    db: Session,
    commodity_name: str,
    previous_price: float,
    new_price: float,
    currency: str,
    change_percentage: float,
):
    """Send price alert emails to all subscribers of this commodity."""
    try:
        from app.models.price_alert import PriceAlert, AlertType
        from app.models.user import User
        from app.services.email import send_price_alert_email

        alerts = db.query(PriceAlert).filter(
            PriceAlert.commodity_name.ilike(f"%{commodity_name}%"),
            PriceAlert.is_active == True,
        ).all()

        for alert in alerts:
            user = db.query(User).filter(User.id == alert.user_id).first()
            if not user:
                continue

            should_trigger = False
            if alert.alert_type == AlertType.ANY_CHANGE:
                should_trigger = True
            elif alert.alert_type == AlertType.ABOVE and new_price > (alert.target_price or 0):
                should_trigger = True
            elif alert.alert_type == AlertType.BELOW and new_price < (alert.target_price or float("inf")):
                should_trigger = True

            if should_trigger:
                send_price_alert_email(
                    user.email,
                    user.first_name,
                    commodity_name,
                    previous_price,
                    new_price,
                    currency,
                    change_percentage,
                )
                alert.last_triggered = datetime.utcnow()

        db.commit()
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to trigger price alerts: {e}")


@router.put("/{commodity_id}", summary="Update commodity price (admin only)")
async def update_commodity(
    commodity_id:     uuid.UUID,
    payload:          CommodityUpdateSchema,
    background_tasks: BackgroundTasks,
    current_user=     Depends(get_admin_user),
    db:               Session = Depends(get_db),
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

    previous_price     = commodity.price
    price_changed      = False
    change_percentage  = 0.0

    if payload.price is not None and payload.price != commodity.price:
        commodity.previous_price    = commodity.price
        change = ((payload.price - commodity.price) / commodity.price) * 100 if commodity.price else 0
        commodity.change_percentage = round(change, 2)
        commodity.trend = (
            PriceTrend.UP     if change > 0 else
            PriceTrend.DOWN   if change < 0 else
            PriceTrend.STABLE
        )
        change_percentage = commodity.change_percentage
        price_changed     = True
        commodity.price   = payload.price

    update_data = payload.model_dump(exclude_unset=True, exclude={"price"})
    for field, value in update_data.items():
        setattr(commodity, field, value)

    commodity.updated_by = current_user.id
    commodity.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(commodity)

    # Trigger alerts in background if price changed by 1%+
    if price_changed and abs(change_percentage) >= 1:
        background_tasks.add_task(
            _trigger_price_alerts,
            db,
            commodity.commodity_name,
            previous_price,
            commodity.price,
            commodity.currency,
            change_percentage,
        )

    return success_response(
        data=CommodityResponseSchema.model_validate(commodity).model_dump(mode="json"),
        message="Commodity price updated",
    )


@router.delete("/{commodity_id}", summary="Remove commodity from board (admin only)")
async def delete_commodity(
    commodity_id: uuid.UUID,
    current_user= Depends(get_admin_user),
    db:           Session = Depends(get_db),
):
    commodity = db.query(CommodityPrice).filter(CommodityPrice.id == commodity_id).first()
    if not commodity:
        raise HTTPException(status_code=404, detail="Commodity not found")

    commodity.is_active = False
    db.commit()
    return success_response(message="Commodity removed from price board")

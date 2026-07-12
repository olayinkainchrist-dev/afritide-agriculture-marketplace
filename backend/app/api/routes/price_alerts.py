"""
Afritide - Price Alert Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.responses import success_response, paginated_response
from app.core.dependencies import get_pagination, PaginationParams
from app.models.price_alert import PriceAlert, AlertType
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class PriceAlertCreate(BaseModel):
    commodity_name: str
    alert_type: AlertType = AlertType.ANY_CHANGE
    target_price: Optional[float] = None
    currency: str = "NGN"


@router.get("", summary="Get my price alerts")
async def get_my_alerts(
    current_user=Depends(get_current_user),
    pagination: PaginationParams = Depends(get_pagination),
    db: Session = Depends(get_db),
):
    alerts = db.query(PriceAlert).filter(
        PriceAlert.user_id == current_user.id,
        PriceAlert.is_active == True,
    ).all()

    return success_response(data=[{
        "id": str(a.id),
        "commodity_name": a.commodity_name,
        "alert_type": a.alert_type,
        "target_price": a.target_price,
        "currency": a.currency,
        "is_active": a.is_active,
        "last_triggered": a.last_triggered.isoformat() if a.last_triggered else None,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    } for a in alerts])


@router.post("", summary="Create a price alert")
async def create_alert(
    payload: PriceAlertCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Check if alert already exists
    existing = db.query(PriceAlert).filter(
        PriceAlert.user_id == current_user.id,
        PriceAlert.commodity_name == payload.commodity_name,
        PriceAlert.is_active == True,
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Alert already exists for this commodity")

    alert = PriceAlert(
        user_id=current_user.id,
        commodity_name=payload.commodity_name,
        alert_type=payload.alert_type,
        target_price=payload.target_price,
        currency=payload.currency,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    return success_response(
        data={"id": str(alert.id), "commodity_name": alert.commodity_name},
        message="Price alert created",
        status_code=201,
    )


@router.delete("/{alert_id}", summary="Delete a price alert")
async def delete_alert(
    alert_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alert = db.query(PriceAlert).filter(
        PriceAlert.id == alert_id,
        PriceAlert.user_id == current_user.id,
    ).first()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_active = False
    db.commit()

    return success_response(message="Alert removed")
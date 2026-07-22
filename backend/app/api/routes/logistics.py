"""
Afritide - Logistics & Shipment Tracking Routes
Folder: backend/app/api/routes/logistics.py
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional
import uuid

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.responses import success_response
from app.models.logistics import Shipment, ShipmentStatus
from app.models.order import Order

router = APIRouter()


@router.post("/shipments", summary="Create a shipment for an order")
async def create_shipment(
    order_id:            uuid.UUID,
    carrier:             str   = None,
    origin_address:      str   = None,
    destination_address: str   = None,
    weight_kg:           float = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(Order.id == order_id, Order.seller_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    tracking_number = f"AFT-SHP-{uuid.uuid4().hex[:10].upper()}"
    shipment = Shipment(
        order_id=            order.id,
        tracking_number=     tracking_number,
        carrier=             carrier,
        origin_address=      origin_address,
        destination_address= destination_address,
        weight_kg=           weight_kg,
        status=              ShipmentStatus.BOOKED,
        tracking_history=    [{"status": "booked", "timestamp": datetime.utcnow().isoformat()}],
    )
    db.add(shipment)
    order.tracking_number = tracking_number
    db.commit()
    db.refresh(shipment)

    return success_response(
        data={
            "id":              str(shipment.id),
            "tracking_number": shipment.tracking_number,
            "status":          shipment.status,
        },
        message="Shipment created",
        status_code=201,
    )


@router.get("/shipments/track/{tracking_number}", summary="Track a shipment")
async def track_shipment(tracking_number: str, db: Session = Depends(get_db)):
    shipment = db.query(Shipment).filter(Shipment.tracking_number == tracking_number).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    return success_response(data={
        "tracking_number":    shipment.tracking_number,
        "carrier":            shipment.carrier,
        "status":             shipment.status,
        "origin_country":     shipment.origin_country,
        "destination_country":shipment.destination_country,
        "estimated_arrival":  shipment.estimated_arrival,
        "tracking_history":   shipment.tracking_history,
    })


@router.put("/shipments/{shipment_id}/status", summary="Update shipment status")
async def update_shipment_status(
    shipment_id: uuid.UUID,
    status:      ShipmentStatus,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    shipment.status  = status
    history          = shipment.tracking_history or []
    history.append({"status": status.value, "timestamp": datetime.utcnow().isoformat()})
    shipment.tracking_history = history

    if status == ShipmentStatus.DELIVERED:
        shipment.actual_arrival = datetime.utcnow()

    db.commit()
    return success_response(message="Shipment status updated")


# ── Shipping Quote Engine ─────────────────────────────────────────────────────

class ShippingItem(BaseModel):
    product_id:      str
    quantity:        float
    unit:            str
    category:        str
    weight_per_unit: Optional[float] = None


class ShippingQuoteRequest(BaseModel):
    items:        List[ShippingItem]
    origin_state: str
    dest_state:   str
    dest_country: str = "Nigeria"


@router.post("/quote", summary="Get shipping quote")
async def get_shipping_quote(
    payload: ShippingQuoteRequest,
    db:      Session = Depends(get_db),
):
    from app.services.logistics import calculate_shipping, calculate_total_weight

    items_dict   = [item.dict() for item in payload.items]
    total_weight = calculate_total_weight(items_dict)
    category     = payload.items[0].category if payload.items else "CASH_CROPS"

    result = await calculate_shipping(
        db=           db,
        origin_state= payload.origin_state,
        dest_state=   payload.dest_state,
        dest_country= payload.dest_country,
        weight_kg=    total_weight,
        category=     category,
    )

    return success_response(data=result)


@router.post("/calculate-shipping", summary="Calculate estimated shipping cost")
async def calculate_shipping_estimate(
    payload: ShippingQuoteRequest,
    db:      Session = Depends(get_db),
):
    """Upgraded - uses zone-based logistics engine instead of flat rate."""
    from app.services.logistics import calculate_shipping, calculate_total_weight

    items_dict   = [item.dict() for item in payload.items]
    total_weight = calculate_total_weight(items_dict)
    category     = payload.items[0].category if payload.items else "CASH_CROPS"

    result = await calculate_shipping(
        db=           db,
        origin_state= payload.origin_state,
        dest_state=   payload.dest_state,
        dest_country= payload.dest_country,
        weight_kg=    total_weight,
        category=     category,
    )

    return success_response(data=result)


@router.get("/zones", summary="Get all shipping zones")
async def get_zones(db: Session = Depends(get_db)):
    from sqlalchemy import text
    zones = db.execute(text(
        "SELECT DISTINCT origin, destination, zone FROM shipping_zones "
        "WHERE country = 'Nigeria' ORDER BY origin, zone"
    )).fetchall()
    return success_response(data=[
        {"origin": z[0], "destination": z[1], "zone": z[2]}
        for z in zones
    ])


@router.get("/profiles", summary="Get shipping profiles")
async def get_profiles():
    from app.services.logistics import CATEGORY_TO_PROFILE
    return success_response(data=CATEGORY_TO_PROFILE)
"""
Afritide - Logistics & Shipment Tracking Routes
Folder: backend/app/api/routes/logistics.py
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.responses import success_response
from app.models.logistics import Shipment, ShipmentStatus
from app.models.order import Order

router = APIRouter()


@router.post("/shipments", summary="Create a shipment for an order")
async def create_shipment(
    order_id: uuid.UUID,
    carrier: str = None,
    origin_address: str = None,
    destination_address: str = None,
    weight_kg: float = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(Order.id == order_id, Order.seller_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    tracking_number = f"AFT-SHP-{uuid.uuid4().hex[:10].upper()}"
    shipment = Shipment(
        order_id=order.id,
        tracking_number=tracking_number,
        carrier=carrier,
        origin_address=origin_address,
        destination_address=destination_address,
        weight_kg=weight_kg,
        status=ShipmentStatus.BOOKED,
        tracking_history=[{"status": "booked", "timestamp": datetime.utcnow().isoformat()}],
    )
    db.add(shipment)
    order.tracking_number = tracking_number
    db.commit()
    db.refresh(shipment)

    return success_response(
        data={"id": str(shipment.id), "tracking_number": shipment.tracking_number, "status": shipment.status},
        message="Shipment created",
        status_code=201,
    )


@router.get("/shipments/track/{tracking_number}", summary="Track a shipment")
async def track_shipment(tracking_number: str, db: Session = Depends(get_db)):
    shipment = db.query(Shipment).filter(Shipment.tracking_number == tracking_number).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    return success_response(data={
        "tracking_number": shipment.tracking_number,
        "carrier": shipment.carrier,
        "status": shipment.status,
        "origin_country": shipment.origin_country,
        "destination_country": shipment.destination_country,
        "estimated_arrival": shipment.estimated_arrival,
        "tracking_history": shipment.tracking_history,
    })


@router.put("/shipments/{shipment_id}/status", summary="Update shipment status")
async def update_shipment_status(
    shipment_id: uuid.UUID,
    status: ShipmentStatus,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    shipment.status = status
    history = shipment.tracking_history or []
    history.append({"status": status.value, "timestamp": datetime.utcnow().isoformat()})
    shipment.tracking_history = history

    if status == ShipmentStatus.DELIVERED:
        shipment.actual_arrival = datetime.utcnow()

    db.commit()
    return success_response(message="Shipment status updated")


@router.post("/calculate-shipping", summary="Calculate estimated shipping cost")
async def calculate_shipping(
    origin_country: str,
    destination_country: str,
    weight_kg: float,
):
    """Simple estimation - replace with real carrier API integration in Phase 2."""
    base_rate = 2.5  # USD per kg
    international_multiplier = 1.0 if origin_country == destination_country else 2.2
    estimated_cost = round(weight_kg * base_rate * international_multiplier, 2)
    estimated_days = 3 if origin_country == destination_country else 14

    return success_response(data={
        "estimated_cost": estimated_cost,
        "currency": "USD",
        "estimated_delivery_days": estimated_days,
        "origin_country": origin_country,
        "destination_country": destination_country,
    })

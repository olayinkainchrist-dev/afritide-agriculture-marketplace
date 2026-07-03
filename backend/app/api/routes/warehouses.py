"""
Afritide - Warehouses Routes
Folder: backend/app/api/routes/warehouses.py
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional
import uuid

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_pagination, PaginationParams
from app.core.responses import success_response, paginated_response
from app.models.warehouse import Warehouse

router = APIRouter()


@router.get("", summary="List warehouses")
async def list_warehouses(
    country: Optional[str] = None,
    temperature_controlled: Optional[bool] = None,
    pagination: PaginationParams = Depends(get_pagination),
    db: Session = Depends(get_db),
):
    query = db.query(Warehouse).filter(Warehouse.is_active == True)
    if country:
        query = query.filter(Warehouse.country.ilike(f"%{country}%"))
    if temperature_controlled is not None:
        query = query.filter(Warehouse.temperature_controlled == temperature_controlled)

    query = query.order_by(desc(Warehouse.is_verified), desc(Warehouse.rating_average))
    total = query.count()
    warehouses = query.offset(pagination.offset).limit(pagination.page_size).all()

    return paginated_response(
        data=[{
            "id": str(w.id), "name": w.name, "country": w.country, "state": w.state,
            "city": w.city, "capacity_tonnes": w.capacity_tonnes,
            "available_capacity_tonnes": w.available_capacity_tonnes,
            "temperature_controlled": w.temperature_controlled,
            "storage_rate_per_tonne": w.storage_rate_per_tonne, "currency": w.currency,
            "is_verified": w.is_verified, "rating_average": w.rating_average,
        } for w in warehouses],
        total=total, page=pagination.page, page_size=pagination.page_size,
    )


@router.post("", summary="Register a warehouse")
async def create_warehouse(
    name: str, country: str, capacity_tonnes: float = None,
    storage_rate_per_tonne: float = None, temperature_controlled: bool = False,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    warehouse = Warehouse(
        owner_id=current_user.id, name=name, country=country,
        capacity_tonnes=capacity_tonnes, available_capacity_tonnes=capacity_tonnes,
        storage_rate_per_tonne=storage_rate_per_tonne,
        temperature_controlled=temperature_controlled,
    )
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)

    return success_response(
        data={"id": str(warehouse.id), "name": warehouse.name},
        message="Warehouse registered. Pending verification.",
        status_code=201,
    )


@router.get("/{warehouse_id}", summary="Get warehouse details")
async def get_warehouse(warehouse_id: uuid.UUID, db: Session = Depends(get_db)):
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id, Warehouse.is_active == True).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    return success_response(data={
        "id": str(warehouse.id), "name": warehouse.name, "description": warehouse.description,
        "country": warehouse.country, "state": warehouse.state, "city": warehouse.city,
        "address": warehouse.address, "capacity_tonnes": warehouse.capacity_tonnes,
        "available_capacity_tonnes": warehouse.available_capacity_tonnes,
        "temperature_controlled": warehouse.temperature_controlled,
        "storage_rate_per_tonne": warehouse.storage_rate_per_tonne,
        "currency": warehouse.currency, "is_verified": warehouse.is_verified,
        "rating_average": warehouse.rating_average,
    })

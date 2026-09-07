"""
Afritide - Commission Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from decimal import Decimal
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
import uuid

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_admin_user
from app.core.responses import success_response
from app.models.commission import (
    SellerCommissionRule, SellerCommissionProfile,
    TransactionFee, SellerPayout, CommissionAuditLog,
)
from app.models.user import User
from app.services.commission_service import calculate_commission, get_seller_commission_rate

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class CommissionCalculatePayload(BaseModel):
    amount:           float
    category:         Optional[str] = None
    transaction_type: Optional[str] = "B2C"
    shipping_cost:    Optional[float] = 0.0


class CommissionRulePayload(BaseModel):
    name:             str
    description:      Optional[str] = None
    seller_type:      Optional[str] = None
    transaction_type: Optional[str] = None
    category:         Optional[str] = None
    rate_percentage:  float
    min_amount:       Optional[float] = 0.0
    max_amount:       Optional[float] = None
    priority:         Optional[int] = 10
    effective_from:   Optional[datetime] = None
    effective_until:  Optional[datetime] = None


class SellerRatePayload(BaseModel):
    seller_id:      str
    custom_rate:    float
    reason:         Optional[str] = None
    effective_from: Optional[datetime] = None
    effective_until:Optional[datetime] = None


# ── Commission Preview ────────────────────────────────────────────────────────

@router.post("/calculate", summary="Calculate commission preview")
async def calculate_commission_preview(
    payload:     CommissionCalculatePayload,
    current_user = Depends(get_current_user),
    db: Session  = Depends(get_db),
):
    """Backend-authoritative commission calculation. Never trust frontend values."""
    breakdown = calculate_commission(
        seller_id        = str(current_user.id),
        seller_role      = current_user.role.value,
        subtotal         = Decimal(str(payload.amount)),
        shipping_cost    = Decimal(str(payload.shipping_cost or 0)),
        category         = payload.category,
        transaction_type = payload.transaction_type or "B2C",
        db               = db,
    )
    return success_response(data=breakdown)


# ── Seller Commission Info ─────────────────────────────────────────────────────

@router.get("/my-rate", summary="Get my current commission rate")
async def get_my_commission_rate(
    current_user = Depends(get_current_user),
    db: Session  = Depends(get_db),
):
    rate, rule_name, rule_id = get_seller_commission_rate(
        seller_id   = str(current_user.id),
        seller_role = current_user.role.value,
        amount      = Decimal("100000"),
        db          = db,
    )

    # Get all active rules for fee schedule
    rules = db.query(SellerCommissionRule).filter(
        SellerCommissionRule.is_active == True
    ).order_by(desc(SellerCommissionRule.priority)).all()

    return success_response(data={
        "current_rate":    float(rate),
        "rule_name":       rule_name,
        "seller_type":     current_user.role.value,
        "effective_from":  datetime.utcnow().isoformat(),
        "fee_schedule": [{
            "name":             r.name,
            "seller_type":      r.seller_type,
            "transaction_type": r.transaction_type,
            "category":         r.category,
            "rate_percentage":  float(r.rate_percentage),
            "min_amount":       float(r.min_amount) if r.min_amount else None,
            "max_amount":       float(r.max_amount) if r.max_amount else None,
        } for r in rules],
    })


@router.get("/my-payouts", summary="Get my payout history")
async def get_my_payouts(
    page:        int = Query(default=1, ge=1),
    page_size:   int = Query(default=20, le=50),
    current_user = Depends(get_current_user),
    db: Session  = Depends(get_db),
):
    query = db.query(SellerPayout).filter(
        SellerPayout.seller_id == current_user.id
    )
    total = query.count()
    items = query.order_by(desc(SellerPayout.created_at)).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    # Summary
    total_gross      = db.query(func.sum(SellerPayout.gross_amount)).filter(SellerPayout.seller_id == current_user.id).scalar() or 0
    total_commission = db.query(func.sum(SellerPayout.commission_amount)).filter(SellerPayout.seller_id == current_user.id).scalar() or 0
    total_net        = db.query(func.sum(SellerPayout.net_amount)).filter(SellerPayout.seller_id == current_user.id).scalar() or 0

    return success_response(data={
        "summary": {
            "total_gross":      float(total_gross),
            "total_commission": float(total_commission),
            "total_net":        float(total_net),
        },
        "items": [{
            "id":                str(p.id),
            "order_id":          str(p.order_id),
            "gross_amount":      float(p.gross_amount),
            "commission_rate":   float(p.commission_rate),
            "commission_amount": float(p.commission_amount),
            "logistics_fee":     float(p.logistics_fee),
            "net_amount":        float(p.net_amount),
            "currency":          p.currency,
            "payout_status":     p.payout_status,
            "created_at":        p.created_at.isoformat(),
        } for p in items],
        "total":     total,
        "page":      page,
        "page_size": page_size,
    })


# ── Admin Endpoints ───────────────────────────────────────────────────────────

@router.get("/admin/rules", summary="List commission rules")
async def admin_list_rules(
    current_user = Depends(get_admin_user),
    db: Session  = Depends(get_db),
):
    rules = db.query(SellerCommissionRule).order_by(
        desc(SellerCommissionRule.priority)
    ).all()
    return success_response(data=[{
        "id":               str(r.id),
        "name":             r.name,
        "description":      r.description,
        "seller_type":      r.seller_type,
        "transaction_type": r.transaction_type,
        "category":         r.category,
        "rate_percentage":  float(r.rate_percentage),
        "min_amount":       float(r.min_amount) if r.min_amount else None,
        "max_amount":       float(r.max_amount) if r.max_amount else None,
        "priority":         r.priority,
        "is_active":        r.is_active,
        "effective_from":   r.effective_from.isoformat() if r.effective_from else None,
        "effective_until":  r.effective_until.isoformat() if r.effective_until else None,
    } for r in rules])


@router.post("/admin/rules", summary="Create commission rule")
async def admin_create_rule(
    payload:     CommissionRulePayload,
    current_user = Depends(get_admin_user),
    db: Session  = Depends(get_db),
):
    rule = SellerCommissionRule(
        name             = payload.name,
        description      = payload.description,
        seller_type      = payload.seller_type,
        transaction_type = payload.transaction_type,
        category         = payload.category,
        rate_percentage  = Decimal(str(payload.rate_percentage)),
        min_amount       = Decimal(str(payload.min_amount or 0)),
        max_amount       = Decimal(str(payload.max_amount)) if payload.max_amount else None,
        priority         = payload.priority or 10,
        effective_from   = payload.effective_from or datetime.utcnow(),
        effective_until  = payload.effective_until,
        created_by       = current_user.id,
    )
    db.add(rule)

    log = CommissionAuditLog(
        rule_id      = None,
        previous_value = None,
        new_value    = {"name": payload.name, "rate": payload.rate_percentage},
        action       = "CREATE",
        reason       = f"Rule created by admin",
        performed_by = current_user.id,
    )
    db.add(log)
    db.commit()
    db.refresh(rule)
    log.rule_id = rule.id
    db.commit()

    return success_response(
        data       = {"id": str(rule.id)},
        message    = "Commission rule created",
        status_code= 201,
    )


@router.put("/admin/rules/{rule_id}", summary="Update commission rule")
async def admin_update_rule(
    rule_id:     uuid.UUID,
    payload:     CommissionRulePayload,
    current_user = Depends(get_admin_user),
    db: Session  = Depends(get_db),
):
    rule = db.query(SellerCommissionRule).filter(
        SellerCommissionRule.id == rule_id
    ).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    previous = {"name": rule.name, "rate": float(rule.rate_percentage)}

    rule.name             = payload.name
    rule.description      = payload.description
    rule.seller_type      = payload.seller_type
    rule.transaction_type = payload.transaction_type
    rule.category         = payload.category
    rule.rate_percentage  = Decimal(str(payload.rate_percentage))
    rule.priority         = payload.priority or rule.priority
    rule.effective_from   = payload.effective_from or rule.effective_from
    rule.effective_until  = payload.effective_until
    rule.updated_at       = datetime.utcnow()

    log = CommissionAuditLog(
        rule_id        = rule.id,
        previous_value = previous,
        new_value      = {"name": payload.name, "rate": payload.rate_percentage},
        action         = "UPDATE",
        performed_by   = current_user.id,
    )
    db.add(log)
    db.commit()

    return success_response(message="Rule updated")


@router.put("/admin/rules/{rule_id}/toggle", summary="Toggle rule active status")
async def admin_toggle_rule(
    rule_id:     uuid.UUID,
    current_user = Depends(get_admin_user),
    db: Session  = Depends(get_db),
):
    rule = db.query(SellerCommissionRule).filter(
        SellerCommissionRule.id == rule_id
    ).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    rule.is_active  = not rule.is_active
    rule.updated_at = datetime.utcnow()

    log = CommissionAuditLog(
        rule_id      = rule.id,
        previous_value = {"is_active": not rule.is_active},
        new_value    = {"is_active": rule.is_active},
        action       = "TOGGLE",
        performed_by = current_user.id,
    )
    db.add(log)
    db.commit()

    return success_response(message=f"Rule {'activated' if rule.is_active else 'deactivated'}")


@router.post("/admin/seller-rates", summary="Set seller-specific rate")
async def admin_set_seller_rate(
    payload:     SellerRatePayload,
    current_user = Depends(get_admin_user),
    db: Session  = Depends(get_db),
):
    # Deactivate existing profile
    db.query(SellerCommissionProfile).filter(
        SellerCommissionProfile.seller_id == payload.seller_id,
        SellerCommissionProfile.is_active == True,
    ).update({"is_active": False})

    profile = SellerCommissionProfile(
        seller_id      = payload.seller_id,
        custom_rate    = Decimal(str(payload.custom_rate)),
        reason         = payload.reason,
        effective_from = payload.effective_from or datetime.utcnow(),
        effective_until= payload.effective_until,
        created_by     = current_user.id,
    )
    db.add(profile)
    db.commit()

    return success_response(message="Seller-specific rate set", status_code=201)


@router.get("/admin/overview", summary="Admin commission overview")
async def admin_overview(
    current_user = Depends(get_admin_user),
    db: Session  = Depends(get_db),
):
    total_commission = db.query(func.sum(SellerPayout.commission_amount)).scalar() or 0
    total_gross      = db.query(func.sum(SellerPayout.gross_amount)).scalar() or 0
    total_payouts    = db.query(SellerPayout).count()
    pending_payouts  = db.query(SellerPayout).filter(SellerPayout.payout_status == "PENDING").count()
    avg_rate         = db.query(func.avg(SellerPayout.commission_rate)).scalar() or 0

    return success_response(data={
        "total_commission": float(total_commission),
        "total_gross":      float(total_gross),
        "total_payouts":    total_payouts,
        "pending_payouts":  pending_payouts,
        "avg_rate":         round(float(avg_rate), 2),
    })


@router.get("/admin/payouts", summary="All seller payouts")
async def admin_payouts(
    status:      Optional[str] = None,
    page:        int = Query(default=1, ge=1),
    page_size:   int = Query(default=20, le=50),
    current_user = Depends(get_admin_user),
    db: Session  = Depends(get_db),
):
    query = db.query(SellerPayout)
    if status:
        query = query.filter(SellerPayout.payout_status == status.upper())
    total = query.count()
    items = query.order_by(desc(SellerPayout.created_at)).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    return success_response(data={
        "items": [{
            "id":                str(p.id),
            "seller_id":         str(p.seller_id),
            "order_id":          str(p.order_id),
            "gross_amount":      float(p.gross_amount),
            "commission_rate":   float(p.commission_rate),
            "commission_amount": float(p.commission_amount),
            "net_amount":        float(p.net_amount),
            "currency":          p.currency,
            "payout_status":     p.payout_status,
            "created_at":        p.created_at.isoformat(),
        } for p in items],
        "total":     total,
        "page":      page,
        "page_size": page_size,
    })
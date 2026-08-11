"""
Afritide - Referral & Commission System
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Optional
import uuid
import random
import string

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_admin_user
from app.core.responses import success_response
from app.models.referral import (
    ReferralCode, ReferralRelationship, ReferralClick,
    CommissionRule, CommissionTransaction, ReferralWithdrawal,
    ReferralRiskEvent, ReferralCampaign,
)
from app.models.user import User
from app.models.order import Order, OrderStatus

router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────

def generate_referral_code() -> str:
    chars = string.ascii_uppercase + string.digits
    suffix = "".join(random.choices(chars, k=5))
    return f"AFR-{suffix}"


def get_or_create_referral_code(user_id: uuid.UUID, db: Session) -> ReferralCode:
    code = db.query(ReferralCode).filter(ReferralCode.user_id == user_id).first()
    if not code:
        # Generate unique code
        for _ in range(10):
            new_code = generate_referral_code()
            exists = db.query(ReferralCode).filter(ReferralCode.code == new_code).first()
            if not exists:
                code = ReferralCode(user_id=user_id, code=new_code)
                db.add(code)
                db.commit()
                db.refresh(code)
                break
    return code


def get_active_rule(db: Session) -> Optional[CommissionRule]:
    return db.query(CommissionRule).filter(CommissionRule.is_active == True).first()


def calculate_commission(platform_fee: float, rule: CommissionRule) -> float:
    if rule.commission_type == "PERCENTAGE":
        commission = platform_fee * (rule.commission_rate / 100)
    else:
        commission = rule.fixed_amount
    if rule.max_commission:
        commission = min(commission, rule.max_commission)
    return round(commission, 2)


def get_commission_balance(user_id: uuid.UUID, db: Session) -> dict:
    now = datetime.utcnow()

    # Release held commissions that are now available
    db.query(CommissionTransaction).filter(
        CommissionTransaction.referrer_id == user_id,
        CommissionTransaction.status == "HELD",
        CommissionTransaction.held_until <= now,
    ).update({
        "status":       "AVAILABLE",
        "available_at": now,
        "updated_at":   now,
    })
    db.commit()

    total_earned = db.query(func.sum(CommissionTransaction.commission_amount)).filter(
        CommissionTransaction.referrer_id == user_id,
        CommissionTransaction.status.in_(["HELD", "AVAILABLE", "PAID"]),
    ).scalar() or 0.0

    pending = db.query(func.sum(CommissionTransaction.commission_amount)).filter(
        CommissionTransaction.referrer_id == user_id,
        CommissionTransaction.status == "PENDING",
    ).scalar() or 0.0

    held = db.query(func.sum(CommissionTransaction.commission_amount)).filter(
        CommissionTransaction.referrer_id == user_id,
        CommissionTransaction.status == "HELD",
    ).scalar() or 0.0

    available = db.query(func.sum(CommissionTransaction.commission_amount)).filter(
        CommissionTransaction.referrer_id == user_id,
        CommissionTransaction.status == "AVAILABLE",
    ).scalar() or 0.0

    total_withdrawn = db.query(func.sum(ReferralWithdrawal.amount)).filter(
        ReferralWithdrawal.user_id == user_id,
        ReferralWithdrawal.status == "COMPLETED",
    ).scalar() or 0.0

    return {
        "total_earned":    round(total_earned, 2),
        "pending":         round(pending, 2),
        "held":            round(held, 2),
        "available":       round(available, 2),
        "total_withdrawn": round(total_withdrawn, 2),
    }


# ── Schemas ───────────────────────────────────────────────────────────────────

class TrackClickPayload(BaseModel):
    referral_code: str
    ip_address:    Optional[str] = None
    user_agent:    Optional[str] = None


class WithdrawalPayload(BaseModel):
    amount:         float
    bank_name:      str
    account_number: str
    account_name:   str
    bank_code:      Optional[str] = None


class AdminAdjustPayload(BaseModel):
    commission_id: str
    action:        str  # approve, reject, reverse, freeze
    reason:        Optional[str] = None


class WithdrawalActionPayload(BaseModel):
    action:      str  # approve, reject, complete
    admin_notes: Optional[str] = None


# ── User Endpoints ────────────────────────────────────────────────────────────

@router.get("/profile", summary="Get my referral profile")
async def get_referral_profile(
    current_user = Depends(get_current_user),
    db: Session  = Depends(get_db),
):
    code = get_or_create_referral_code(current_user.id, db)
    balance = get_commission_balance(current_user.id, db)

    total_referrals = db.query(ReferralRelationship).filter(
        ReferralRelationship.referrer_id == current_user.id
    ).count()

    active_referrals = db.query(ReferralRelationship).filter(
        ReferralRelationship.referrer_id == current_user.id,
        ReferralRelationship.status.in_(["VERIFIED", "QUALIFIED"]),
    ).count()

    qualifying = db.query(ReferralRelationship).filter(
        ReferralRelationship.referrer_id == current_user.id,
        ReferralRelationship.status == "QUALIFIED",
    ).count()

    rule = get_active_rule(db)

    return success_response(data={
        "referral_code":    code.code,
        "referral_link":    f"https://afritidegroup.com/register?ref={code.code}",
        "is_active":        code.is_active,
        "click_count":      code.click_count,
        "total_referrals":  total_referrals,
        "active_referrals": active_referrals,
        "qualifying":       qualifying,
        "balance":          balance,
        "min_withdrawal":   rule.min_withdrawal if rule else 5000.0,
        "commission_rate":  rule.commission_rate if rule else 10.0,
        "holding_days":     rule.holding_days if rule else 30,
    })


@router.get("/commissions", summary="Get my commission history")
async def get_my_commissions(
    status:      Optional[str] = None,
    page:        int = Query(default=1, ge=1),
    page_size:   int = Query(default=20, le=50),
    current_user = Depends(get_current_user),
    db: Session  = Depends(get_db),
):
    # Release available commissions first
    get_commission_balance(current_user.id, db)

    query = db.query(CommissionTransaction).filter(
        CommissionTransaction.referrer_id == current_user.id
    )
    if status:
        query = query.filter(CommissionTransaction.status == status.upper())

    total  = query.count()
    items  = query.order_by(desc(CommissionTransaction.created_at)).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    return success_response(data={
        "items": [{
            "id":                 str(c.id),
            "referred_id":        str(c.referred_id),
            "referred_name":      f"{c.referred.first_name} {c.referred.last_name}" if c.referred else "",
            "transaction_amount": c.transaction_amount,
            "platform_fee":       c.platform_fee,
            "commission_rate":    c.commission_rate,
            "commission_amount":  c.commission_amount,
            "currency":           c.currency,
            "status":             c.status,
            "held_until":         c.held_until.isoformat() if c.held_until else None,
            "available_at":       c.available_at.isoformat() if c.available_at else None,
            "created_at":         c.created_at.isoformat(),
        } for c in items],
        "total":     total,
        "page":      page,
        "page_size": page_size,
    })


@router.get("/referrals", summary="Get my referrals")
async def get_my_referrals(
    current_user = Depends(get_current_user),
    db: Session  = Depends(get_db),
):
    referrals = db.query(ReferralRelationship).filter(
        ReferralRelationship.referrer_id == current_user.id
    ).order_by(desc(ReferralRelationship.created_at)).limit(50).all()

    return success_response(data=[{
        "id":           str(r.id),
        "referred_id":  str(r.referred_id),
        "name":         f"{r.referred.first_name} {r.referred.last_name}" if r.referred else "",
        "email":        r.referred.email if r.referred else "",
        "status":       r.status,
        "risk_level":   r.risk_level,
        "registered_at":r.registered_at.isoformat(),
        "verified_at":  r.verified_at.isoformat() if r.verified_at else None,
        "qualified_at": r.qualified_at.isoformat() if r.qualified_at else None,
    } for r in referrals])


@router.post("/withdraw", summary="Request withdrawal")
async def request_withdrawal(
    payload:     WithdrawalPayload,
    current_user = Depends(get_current_user),
    db: Session  = Depends(get_db),
):
    balance = get_commission_balance(current_user.id, db)
    rule    = get_active_rule(db)
    min_wd  = rule.min_withdrawal if rule else 5000.0

    if payload.amount < min_wd:
        raise HTTPException(status_code=400, detail=f"Minimum withdrawal is ₦{min_wd:,.0f}")
    if payload.amount > balance["available"]:
        raise HTTPException(status_code=400, detail="Insufficient available balance")

    # Check no pending withdrawal exists
    pending_wd = db.query(ReferralWithdrawal).filter(
        ReferralWithdrawal.user_id == current_user.id,
        ReferralWithdrawal.status.in_(["PENDING", "PROCESSING"]),
    ).first()
    if pending_wd:
        raise HTTPException(status_code=400, detail="You already have a pending withdrawal")

    # Generate unique reference
    reference = f"WD-{uuid.uuid4().hex[:10].upper()}"

    withdrawal = ReferralWithdrawal(
        user_id        = current_user.id,
        amount         = payload.amount,
        currency       = "NGN",
        bank_name      = payload.bank_name,
        account_number = payload.account_number,
        account_name   = payload.account_name,
        bank_code      = payload.bank_code,
        reference      = reference,
        status         = "PENDING",
    )
    db.add(withdrawal)

    # Mark commissions as processing
    available_commissions = db.query(CommissionTransaction).filter(
        CommissionTransaction.referrer_id == current_user.id,
        CommissionTransaction.status == "AVAILABLE",
    ).order_by(CommissionTransaction.available_at).all()

    remaining = payload.amount
    for comm in available_commissions:
        if remaining <= 0:
            break
        comm.status     = "PROCESSING"
        comm.updated_at = datetime.utcnow()
        remaining -= comm.commission_amount

    db.commit()
    db.refresh(withdrawal)

    return success_response(
        data={"id": str(withdrawal.id), "reference": reference, "status": "PENDING"},
        message="Withdrawal request submitted successfully",
        status_code=201,
    )


@router.get("/withdrawals", summary="Get my withdrawal history")
async def get_my_withdrawals(
    current_user = Depends(get_current_user),
    db: Session  = Depends(get_db),
):
    withdrawals = db.query(ReferralWithdrawal).filter(
        ReferralWithdrawal.user_id == current_user.id
    ).order_by(desc(ReferralWithdrawal.created_at)).limit(20).all()

    return success_response(data=[{
        "id":             str(w.id),
        "amount":         w.amount,
        "currency":       w.currency,
        "bank_name":      w.bank_name,
        "account_number": w.account_number,
        "account_name":   w.account_name,
        "status":         w.status,
        "reference":      w.reference,
        "created_at":     w.created_at.isoformat(),
        "processed_at":   w.processed_at.isoformat() if w.processed_at else None,
    } for w in withdrawals])


# ── Attribution (called during registration) ──────────────────────────────────

@router.post("/track-click", summary="Track referral link click")
async def track_click(payload: TrackClickPayload, db: Session = Depends(get_db)):
    code = db.query(ReferralCode).filter(
        ReferralCode.code == payload.referral_code,
        ReferralCode.is_active == True,
    ).first()
    if not code:
        raise HTTPException(status_code=404, detail="Invalid referral code")

    click = ReferralClick(
        referral_code = payload.referral_code,
        ip_address    = payload.ip_address,
        user_agent    = payload.user_agent,
    )
    db.add(click)
    code.click_count += 1
    db.commit()
    return success_response(message="Click tracked")


@router.post("/attribute", summary="Attribute new user to referrer")
async def attribute_referral(
    referral_code: str,
    current_user  = Depends(get_current_user),
    db: Session   = Depends(get_db),
):
    # Prevent self-referral
    code = db.query(ReferralCode).filter(ReferralCode.code == referral_code).first()
    if not code:
        raise HTTPException(status_code=404, detail="Invalid referral code")
    if code.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Self-referral not allowed")

    # Check rule attribution window
    rule = get_active_rule(db)
    attribution_days = rule.attribution_days if rule else 30
    if (datetime.utcnow() - code.updated_at).days > attribution_days:
        raise HTTPException(status_code=400, detail="Referral link expired")

    # Check not already attributed
    existing = db.query(ReferralRelationship).filter(
        ReferralRelationship.referred_id == current_user.id
    ).first()
    if existing:
        return success_response(message="Already attributed")

    relationship = ReferralRelationship(
        referrer_id   = code.user_id,
        referred_id   = current_user.id,
        referral_code = referral_code,
        status        = "REGISTERED",
    )
    db.add(relationship)
    db.commit()

    return success_response(message="Referral attributed successfully")


# ── Commission Engine (called when order completes) ────────────────────────────

def process_order_commission(order_id: uuid.UUID, db: Session):
    """Called when an order is marked COMPLETED."""
    try:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            return

        # Check if commission already exists for this order
        existing = db.query(CommissionTransaction).filter(
            CommissionTransaction.order_id == order_id
        ).first()
        if existing:
            return  # Idempotency — never double-process

        # Check if platform fee exists
        if not order.platform_fee or order.platform_fee <= 0:
            return

        # Check if buyer was referred
        relationship = db.query(ReferralRelationship).filter(
            ReferralRelationship.referred_id == order.buyer_id,
            ReferralRelationship.status.notin_(["BLOCKED", "FRAUD"]),
        ).first()

        if not relationship:
            return

        # Check referrer is not the seller (fraud prevention)
        if relationship.referrer_id == order.seller_id:
            risk_event = ReferralRiskEvent(
                user_id     = relationship.referrer_id,
                event_type  = "SELF_DEAL",
                description = f"Referrer is also the seller on order {order.id}",
                metadata    = {"order_id": str(order_id)},
            )
            db.add(risk_event)
            db.commit()
            return

        # Get active commission rule
        rule = get_active_rule(db)
        if not rule:
            return

        # Check minimum transaction value
        if order.total_amount < rule.min_transaction:
            return

        # Calculate commission from platform fee only
        commission_amount = calculate_commission(order.platform_fee, rule)
        if commission_amount <= 0:
            return

        # Set hold period
        held_until = datetime.utcnow() + timedelta(days=rule.holding_days)

        commission = CommissionTransaction(
            referrer_id        = relationship.referrer_id,
            referred_id        = order.buyer_id,
            order_id           = order_id,
            rule_id            = rule.id,
            transaction_amount = order.total_amount,
            platform_fee       = order.platform_fee,
            commission_rate    = rule.commission_rate,
            commission_amount  = commission_amount,
            currency           = order.currency,
            status             = "HELD",
            held_until         = held_until,
        )
        db.add(commission)

        # Update relationship status
        relationship.status       = "QUALIFIED"
        relationship.qualified_at = datetime.utcnow()

        db.commit()

    except Exception as e:
        db.rollback()


# ── Admin Endpoints ───────────────────────────────────────────────────────────

@router.get("/admin/overview", summary="Admin referral overview")
async def admin_overview(
    current_user = Depends(get_admin_user),
    db: Session  = Depends(get_db),
):
    total_referrals     = db.query(ReferralRelationship).count()
    total_commissions   = db.query(func.sum(CommissionTransaction.commission_amount)).scalar() or 0
    pending_commissions = db.query(func.sum(CommissionTransaction.commission_amount)).filter(
        CommissionTransaction.status.in_(["PENDING", "HELD"])
    ).scalar() or 0
    available_commissions = db.query(func.sum(CommissionTransaction.commission_amount)).filter(
        CommissionTransaction.status == "AVAILABLE"
    ).scalar() or 0
    pending_withdrawals = db.query(ReferralWithdrawal).filter(
        ReferralWithdrawal.status == "PENDING"
    ).count()
    total_paid = db.query(func.sum(ReferralWithdrawal.amount)).filter(
        ReferralWithdrawal.status == "COMPLETED"
    ).scalar() or 0

    return success_response(data={
        "total_referrals":       total_referrals,
        "total_commissions":     round(total_commissions, 2),
        "pending_commissions":   round(pending_commissions, 2),
        "available_commissions": round(available_commissions, 2),
        "pending_withdrawals":   pending_withdrawals,
        "total_paid":            round(total_paid, 2),
    })


@router.get("/admin/commissions", summary="Admin commission list")
async def admin_commissions(
    status:      Optional[str] = None,
    page:        int = Query(default=1, ge=1),
    page_size:   int = Query(default=20, le=50),
    current_user = Depends(get_admin_user),
    db: Session  = Depends(get_db),
):
    query = db.query(CommissionTransaction)
    if status:
        query = query.filter(CommissionTransaction.status == status.upper())
    total = query.count()
    items = query.order_by(desc(CommissionTransaction.created_at)).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    return success_response(data={
        "items": [{
            "id":                 str(c.id),
            "referrer":           f"{c.referrer.first_name} {c.referrer.last_name}" if c.referrer else "",
            "referrer_email":     c.referrer.email if c.referrer else "",
            "referred":           f"{c.referred.first_name} {c.referred.last_name}" if c.referred else "",
            "transaction_amount": c.transaction_amount,
            "platform_fee":       c.platform_fee,
            "commission_rate":    c.commission_rate,
            "commission_amount":  c.commission_amount,
            "currency":           c.currency,
            "status":             c.status,
            "risk_level":         c.risk_level,
            "held_until":         c.held_until.isoformat() if c.held_until else None,
            "created_at":         c.created_at.isoformat(),
        } for c in items],
        "total":     total,
        "page":      page,
        "page_size": page_size,
    })


@router.put("/admin/commissions/{commission_id}/action", summary="Admin commission action")
async def admin_commission_action(
    commission_id: uuid.UUID,
    payload:       AdminAdjustPayload,
    current_user  = Depends(get_admin_user),
    db: Session   = Depends(get_db),
):
    commission = db.query(CommissionTransaction).filter(
        CommissionTransaction.id == commission_id
    ).first()
    if not commission:
        raise HTTPException(status_code=404, detail="Commission not found")

    now = datetime.utcnow()
    action = payload.action.lower()

    if action == "approve":
        commission.status       = "AVAILABLE"
        commission.available_at = now
    elif action == "reject":
        commission.status = "REJECTED"
        commission.notes  = payload.reason
    elif action == "reverse":
        commission.status          = "REVERSED"
        commission.reversed_at     = now
        commission.reversal_reason = payload.reason
    elif action == "freeze":
        commission.status     = "REVIEW_REQUIRED"
        commission.risk_level = "HIGH"
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    commission.updated_at = now
    db.commit()

    return success_response(message=f"Commission {action}d successfully")


@router.get("/admin/withdrawals", summary="Admin withdrawal list")
async def admin_withdrawals(
    status:      Optional[str] = None,
    current_user = Depends(get_admin_user),
    db: Session  = Depends(get_db),
):
    query = db.query(ReferralWithdrawal)
    if status:
        query = query.filter(ReferralWithdrawal.status == status.upper())
    withdrawals = query.order_by(desc(ReferralWithdrawal.created_at)).limit(100).all()

    return success_response(data=[{
        "id":             str(w.id),
        "user":           f"{w.user.first_name} {w.user.last_name}" if w.user else "",
        "email":          w.user.email if w.user else "",
        "amount":         w.amount,
        "currency":       w.currency,
        "bank_name":      w.bank_name,
        "account_number": w.account_number,
        "account_name":   w.account_name,
        "status":         w.status,
        "reference":      w.reference,
        "admin_notes":    w.admin_notes,
        "created_at":     w.created_at.isoformat(),
        "processed_at":   w.processed_at.isoformat() if w.processed_at else None,
    } for w in withdrawals])


@router.put("/admin/withdrawals/{withdrawal_id}/action", summary="Admin withdrawal action")
async def admin_withdrawal_action(
    withdrawal_id: uuid.UUID,
    payload:       WithdrawalActionPayload,
    current_user  = Depends(get_admin_user),
    db: Session   = Depends(get_db),
):
    withdrawal = db.query(ReferralWithdrawal).filter(
        ReferralWithdrawal.id == withdrawal_id
    ).first()
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")

    now    = datetime.utcnow()
    action = payload.action.lower()

    if action == "approve":
        withdrawal.status = "PROCESSING"
    elif action == "complete":
        withdrawal.status       = "COMPLETED"
        withdrawal.processed_at = now
        # Mark commissions as paid
        db.query(CommissionTransaction).filter(
            CommissionTransaction.referrer_id == withdrawal.user_id,
            CommissionTransaction.status == "PROCESSING",
        ).update({"status": "PAID", "paid_at": now, "updated_at": now})
    elif action == "reject":
        withdrawal.status = "REJECTED"
        # Return commissions to available
        db.query(CommissionTransaction).filter(
            CommissionTransaction.referrer_id == withdrawal.user_id,
            CommissionTransaction.status == "PROCESSING",
        ).update({"status": "AVAILABLE", "updated_at": now})
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    withdrawal.admin_notes = payload.admin_notes
    withdrawal.updated_at  = now
    db.commit()

    return success_response(message=f"Withdrawal {action}d successfully")


@router.get("/admin/rules", summary="Get commission rules")
async def get_commission_rules(
    current_user = Depends(get_admin_user),
    db: Session  = Depends(get_db),
):
    rules = db.query(CommissionRule).all()
    return success_response(data=[{
        "id":               str(r.id),
        "name":             r.name,
        "commission_rate":  r.commission_rate,
        "holding_days":     r.holding_days,
        "attribution_days": r.attribution_days,
        "min_withdrawal":   r.min_withdrawal,
        "min_transaction":  r.min_transaction,
        "max_commission":   r.max_commission,
        "is_active":        r.is_active,
    } for r in rules])
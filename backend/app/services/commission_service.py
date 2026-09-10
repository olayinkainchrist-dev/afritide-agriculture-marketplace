"""
Afritide - Commission Service
Authoritative backend commission calculation engine.
Never trust frontend commission values.
"""
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
import uuid
import logging

from app.models.commission import (
    SellerCommissionRule, SellerCommissionProfile,
    TransactionFee, SellerPayout,
)
from app.models.user import User

logger = logging.getLogger(__name__)


def get_seller_commission_rate(
    seller_id: str,
    seller_role: str,
    amount: Decimal,
    category: Optional[str] = None,
    transaction_type: Optional[str] = None,
    db: Session = None,
) -> tuple[Decimal, Optional[str], Optional[str]]:
    """
    Returns (rate, rule_name, rule_id).
    Priority:
    1. Seller-specific negotiated rate
    2. Role/type-based rule
    3. Category rule
    4. Default marketplace rate (5%)
    """
    now = datetime.utcnow()

    # 1. Check seller-specific negotiated rate
    profile = db.query(SellerCommissionProfile).filter(
        SellerCommissionProfile.seller_id     == seller_id,
        SellerCommissionProfile.is_active     == True,
        SellerCommissionProfile.effective_from <= now,
    ).filter(
        (SellerCommissionProfile.effective_until == None) |
        (SellerCommissionProfile.effective_until >= now)
    ).first()

    if profile:
        return Decimal(str(profile.custom_rate)), "Negotiated Rate", None

    # 2. Find best matching rule by priority — fetch all active rules, filter in Python
    rules = db.query(SellerCommissionRule).filter(
        SellerCommissionRule.is_active      == True,
        SellerCommissionRule.effective_from <= now,
    ).filter(
        (SellerCommissionRule.effective_until == None) |
        (SellerCommissionRule.effective_until >= now)
    ).order_by(SellerCommissionRule.priority.desc()).all()

    logger.info(f"Found {len(rules)} active commission rules for seller_role={seller_role}, amount={amount}")

    for rule in rules:
        # Amount range check in Python to avoid Decimal/Numeric type issues
        if rule.min_amount is not None and Decimal(str(rule.min_amount)) > amount:
            logger.info(f"Rule {rule.name} skipped: min_amount {rule.min_amount} > {amount}")
            continue
        if rule.max_amount is not None and Decimal(str(rule.max_amount)) < amount:
            logger.info(f"Rule {rule.name} skipped: max_amount {rule.max_amount} < {amount}")
            continue
        # Seller type check
        if rule.seller_type and rule.seller_type != seller_role:
            logger.info(f"Rule {rule.name} skipped: seller_type {rule.seller_type} != {seller_role}")
            continue
        # Transaction type check
        if rule.transaction_type and rule.transaction_type != transaction_type:
            continue
        # Category check
        if rule.category and rule.category != category:
            continue
        logger.info(f"Rule matched: {rule.name} at {rule.rate_percentage}%")
        return Decimal(str(rule.rate_percentage)), rule.name, str(rule.id)

    # 3. Default fallback
    logger.info("No rule matched, using default 5%")
    return Decimal("5.00"), "Standard Marketplace Rate", None


def calculate_commission(
    seller_id: str,
    seller_role: str,
    subtotal: Decimal,
    shipping_cost: Decimal = Decimal("0"),
    category: Optional[str] = None,
    transaction_type: Optional[str] = None,
    currency: str = "NGN",
    db: Session = None,
) -> dict:
    """
    Calculate commission for a transaction.
    Commission is only on product subtotal, NOT on shipping.
    Returns full breakdown dict.
    """
    commissionable_amount = subtotal  # Never include shipping

    rate, rule_name, rule_id = get_seller_commission_rate(
        seller_id, seller_role, commissionable_amount, category, transaction_type, db
    )

    commission_amount = (commissionable_amount * rate / Decimal("100")).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )

    net_payout = commissionable_amount - commission_amount

    return {
        "commissionable_amount": float(commissionable_amount),
        "commission_rate":       float(rate),
        "commission_amount":     float(commission_amount),
        "shipping_cost":         float(shipping_cost),
        "net_payout":            float(net_payout),
        "rule_name":             rule_name,
        "rule_id":               rule_id,
        "currency":              currency,
    }


def record_order_commission(order, seller_role: str, db: Session):
    """
    Called when order is created. Records commission and payout.
    Idempotent — safe to call multiple times.
    """
    try:
        # Check if already recorded
        existing = db.query(SellerPayout).filter(
            SellerPayout.order_id == order.id
        ).first()
        if existing:
            logger.info(f"Commission already recorded for order {order.id}")
            return existing

        subtotal      = Decimal(str(order.subtotal))
        shipping_cost = Decimal(str(order.shipping_cost or 0))

        logger.info(f"Recording commission for order {order.id}, seller_role={seller_role}, subtotal={subtotal}, currency={order.currency}")

        breakdown = calculate_commission(
            seller_id        = str(order.seller_id),
            seller_role      = seller_role,
            subtotal         = subtotal,
            shipping_cost    = shipping_cost,
            category         = None,
            transaction_type = "B2C",
            currency         = order.currency,
            db               = db,
        )

        logger.info(f"Commission breakdown: {breakdown}")

        commission_amount = Decimal(str(breakdown["commission_amount"]))
        net_amount        = Decimal(str(breakdown["net_payout"]))
        rate              = Decimal(str(breakdown["commission_rate"]))
        rule_id           = uuid.UUID(breakdown["rule_id"]) if breakdown["rule_id"] else None

        # Update order platform_fee
        order.platform_fee = float(commission_amount)

        # Record transaction fee
        fee = TransactionFee(
            order_id        = order.id,
            seller_id       = order.seller_id,
            fee_type        = "COMMISSION",
            rate_percentage = rate,
            base_amount     = subtotal,
            fee_amount      = commission_amount,
            currency        = order.currency,
            rule_id         = rule_id,
        )
        db.add(fee)

        # Record seller payout
        payout = SellerPayout(
            seller_id         = order.seller_id,
            order_id          = order.id,
            gross_amount      = subtotal,
            commission_rate   = rate,
            commission_amount = commission_amount,
            logistics_fee     = shipping_cost,
            net_amount        = net_amount,
            currency          = order.currency,
            payout_status     = "PENDING",
        )
        db.add(payout)
        db.commit()

        logger.info(f"Commission recorded successfully for order {order.id}: {float(commission_amount)} {order.currency}")
        return payout

    except Exception as e:
        logger.error(f"Failed to record commission for order {order.id}: {e}")
        db.rollback()
        raise
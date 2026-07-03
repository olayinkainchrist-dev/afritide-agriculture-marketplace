"""
Afritide - Analytics Routes
Folder: backend/app/api/routes/analytics.py
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_admin_user, get_farmer_user
from app.core.responses import success_response
from app.models.product import Product, ProductStatus
from app.models.order import Order, OrderStatus
from app.models.user import User

router = APIRouter()


@router.get("/seller/dashboard", summary="Get seller analytics dashboard")
async def seller_analytics(
    current_user=Depends(get_farmer_user),
    db: Session = Depends(get_db),
):
    total_products = db.query(Product).filter(Product.seller_id == current_user.id).count()
    active_products = db.query(Product).filter(
        Product.seller_id == current_user.id, Product.status == ProductStatus.ACTIVE
    ).count()
    total_orders = db.query(Order).filter(Order.seller_id == current_user.id).count()
    completed_orders = db.query(Order).filter(
        Order.seller_id == current_user.id, Order.status == OrderStatus.COMPLETED
    ).count()
    total_revenue = db.query(func.sum(Order.total_amount)).filter(
        Order.seller_id == current_user.id, Order.status == OrderStatus.COMPLETED
    ).scalar() or 0.0
    total_views = db.query(func.sum(Product.view_count)).filter(
        Product.seller_id == current_user.id
    ).scalar() or 0

    top_products = db.query(Product).filter(
        Product.seller_id == current_user.id
    ).order_by(desc(Product.order_count)).limit(5).all()

    return success_response(data={
        "total_products": total_products,
        "active_products": active_products,
        "total_orders": total_orders,
        "completed_orders": completed_orders,
        "total_revenue": round(total_revenue, 2),
        "total_views": total_views,
        "rating_average": current_user.rating_average,
        "rating_count": current_user.rating_count,
        "top_products": [
            {"id": str(p.id), "title": p.title, "order_count": p.order_count, "view_count": p.view_count}
            for p in top_products
        ],
    })


@router.get("/admin/dashboard", summary="Get platform-wide analytics (admin only)")
async def admin_analytics(
    current_user=Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    from app.models.user import UserRole

    total_users = db.query(User).count()
    total_farmers = db.query(User).filter(
        User.role.in_([UserRole.FARMER, UserRole.COOPERATIVE, UserRole.EXPORTER])
    ).count()
    total_buyers = db.query(User).filter(User.role == UserRole.BUYER).count()

    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    new_users_30d = db.query(User).filter(User.created_at >= thirty_days_ago).count()

    total_products = db.query(Product).count()
    active_products = db.query(Product).filter(Product.status == ProductStatus.ACTIVE).count()
    pending_products = db.query(Product).filter(Product.status == ProductStatus.PENDING_REVIEW).count()

    total_orders = db.query(Order).count()
    total_revenue = db.query(func.sum(Order.total_amount)).filter(
        Order.status == OrderStatus.COMPLETED
    ).scalar() or 0.0

    top_countries = db.query(
        User.country, func.count(User.id).label("count")
    ).filter(User.country.isnot(None)).group_by(User.country).order_by(desc("count")).limit(10).all()

    return success_response(data={
        "total_users": total_users,
        "total_farmers": total_farmers,
        "total_buyers": total_buyers,
        "new_users_30d": new_users_30d,
        "total_products": total_products,
        "active_products": active_products,
        "pending_products": pending_products,
        "total_orders": total_orders,
        "total_revenue": round(total_revenue, 2),
        "top_countries": [{"country": c[0], "count": c[1]} for c in top_countries],
    })

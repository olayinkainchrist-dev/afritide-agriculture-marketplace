"""
Afritide - Admin Routes
User approvals, product moderation, announcements
Folder: backend/app/api/routes/admin.py
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
import uuid
import csv
import io

from app.core.database import get_db
from app.core.dependencies import get_admin_user, get_pagination, PaginationParams
from app.core.responses import success_response, paginated_response
from app.models.user import User, UserStatus
from app.models.product import Product, ProductStatus
from app.models.notification import Notification, NotificationType
from app.services.email import send_kyc_status_email

router = APIRouter()


@router.get("/users", summary="List all users (admin)")
async def list_all_users(
    status:      UserStatus = None,
    pagination:  PaginationParams = Depends(get_pagination),
    current_user=Depends(get_admin_user),
    db:          Session = Depends(get_db),
):
    query = db.query(User)
    if status:
        query = query.filter(User.status == status)
    query = query.order_by(desc(User.created_at))

    total = query.count()
    users = query.offset(pagination.offset).limit(pagination.page_size).all()

    return paginated_response(
        data=[{
            "id":            str(u.id),
            "email":         u.email,
            "first_name":    u.first_name,
            "last_name":     u.last_name,
            "role":          u.role,
            "status":        u.status,
            "kyc_submitted": u.kyc_submitted,
            "kyc_approved":  u.kyc_approved,
            "created_at":    u.created_at,
        } for u in users],
        total=total, page=pagination.page, page_size=pagination.page_size,
    )


@router.put("/users/{user_id}/approve-kyc", summary="Approve user KYC verification")
async def approve_kyc(
    user_id:     uuid.UUID,
    current_user=Depends(get_admin_user),
    db:          Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.kyc_approved    = True
    user.status          = UserStatus.VERIFIED
    user.kyc_reviewed_at = datetime.utcnow()
    db.commit()

    db.add(Notification(
        user_id=user.id, type=NotificationType.ACCOUNT_VERIFIED,
        title="Account Verified",
        message="Your account has been verified! You now have a verified badge.",
    ))
    db.commit()

    send_kyc_status_email(user.email, user.first_name, approved=True)
    return success_response(message="User verified successfully")


@router.put("/users/{user_id}/reject-kyc", summary="Reject user KYC verification")
async def reject_kyc(
    user_id:     uuid.UUID,
    reason:      str,
    current_user=Depends(get_admin_user),
    db:          Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.kyc_approved    = False
    user.kyc_reviewed_at = datetime.utcnow()
    db.commit()

    send_kyc_status_email(user.email, user.first_name, approved=False, reason=reason)
    return success_response(message="KYC rejected, user notified")


@router.put("/users/{user_id}/suspend", summary="Suspend a user")
async def suspend_user(
    user_id:     uuid.UUID,
    current_user=Depends(get_admin_user),
    db:          Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.status = UserStatus.SUSPENDED
    db.commit()
    return success_response(message="User suspended")


@router.put("/users/{user_id}/reactivate", summary="Reactivate a suspended user")
async def reactivate_user(
    user_id:     uuid.UUID,
    current_user=Depends(get_admin_user),
    db:          Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.status = UserStatus.ACTIVE
    db.commit()
    return success_response(message="User reactivated")


@router.get("/products", summary="List all products by status (admin)")
async def list_all_products(
    status:      str = Query(default="pending_review"),
    search:      str = Query(default=None),
    pagination:  PaginationParams = Depends(get_pagination),
    current_user=Depends(get_admin_user),
    db:          Session = Depends(get_db),
):
    query = db.query(Product)

    if status and status != "all":
        try:
            status_enum = ProductStatus(status)
            query = query.filter(Product.status == status_enum)
        except ValueError:
            pass

    if search:
        query = query.filter(Product.title.ilike(f"%{search}%"))

    query = query.order_by(desc(Product.created_at))
    total    = query.count()
    products = query.offset(pagination.offset).limit(pagination.page_size).all()

    return paginated_response(
        data=[{
            "id":                     str(p.id),
            "title":                  p.title,
            "category":               p.category,
            "status":                 p.status,
            "seller_id":              str(p.seller_id),
            "price":                  p.price,
            "currency":               p.currency,
            "unit":                   p.unit,
            "quantity_available":     p.quantity_available,
            "minimum_order_quantity": p.minimum_order_quantity,
            "is_organic":             p.is_organic,
            "is_export_ready":        p.is_export_ready,
            "is_negotiable":          p.is_negotiable,
            "main_image":             p.main_image,
            "images":                 p.images,
            "description":            p.description,
            "short_description":      p.short_description,
            "country":                p.country,
            "state":                  p.state,
            "city":                   p.city,
            "rejection_reason":       p.rejection_reason,
            "created_at":             p.created_at,
            "published_at":           p.published_at,
        } for p in products],
        total=total, page=pagination.page, page_size=pagination.page_size,
    )


@router.get("/products/pending", summary="Get products pending review")
async def get_pending_products(
    pagination:  PaginationParams = Depends(get_pagination),
    current_user=Depends(get_admin_user),
    db:          Session = Depends(get_db),
):
    query = db.query(Product).filter(
        Product.status == ProductStatus.PENDING_REVIEW
    ).order_by(desc(Product.created_at))

    total    = query.count()
    products = query.offset(pagination.offset).limit(pagination.page_size).all()

    return paginated_response(
        data=[{
            "id":                     str(p.id),
            "title":                  p.title,
            "category":               p.category,
            "status":                 p.status,
            "seller_id":              str(p.seller_id),
            "price":                  p.price,
            "currency":               p.currency,
            "unit":                   p.unit,
            "quantity_available":     p.quantity_available,
            "minimum_order_quantity": p.minimum_order_quantity,
            "is_organic":             p.is_organic,
            "is_export_ready":        p.is_export_ready,
            "is_negotiable":          p.is_negotiable,
            "main_image":             p.main_image,
            "images":                 p.images,
            "description":            p.description,
            "short_description":      p.short_description,
            "country":                p.country,
            "state":                  p.state,
            "city":                   p.city,
            "created_at":             p.created_at,
        } for p in products],
        total=total, page=pagination.page, page_size=pagination.page_size,
    )


@router.put("/products/{product_id}/approve", summary="Approve a product listing")
async def approve_product(
    product_id:  uuid.UUID,
    current_user=Depends(get_admin_user),
    db:          Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.status       = ProductStatus.ACTIVE
    product.published_at = datetime.utcnow()
    db.commit()

    db.add(Notification(
        user_id=product.seller_id, type=NotificationType.PRODUCT_APPROVED,
        title="Product Approved",
        message=f"Your listing '{product.title}' is now live on Afritide.",
    ))
    db.commit()

    return success_response(message="Product approved and published")


@router.put("/products/{product_id}/reject", summary="Reject a product listing")
async def reject_product(
    product_id:  uuid.UUID,
    reason:      str,
    current_user=Depends(get_admin_user),
    db:          Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.status           = ProductStatus.REJECTED
    product.rejection_reason = reason
    db.commit()

    db.add(Notification(
        user_id=product.seller_id, type=NotificationType.PRODUCT_REJECTED,
        title="Product Listing Rejected",
        message=f"Your listing '{product.title}' was rejected: {reason}",
    ))
    db.commit()

    return success_response(message="Product rejected")


@router.post("/announcements", summary="Send platform-wide announcement")
async def send_announcement(
    title:       str,
    message:     str,
    target_role: str = None,
    current_user=Depends(get_admin_user),
    db:          Session = Depends(get_db),
):
    query = db.query(User).filter(User.status == UserStatus.ACTIVE)
    if target_role:
        query = query.filter(User.role == target_role)
    users = query.all()

    db.bulk_save_objects([
        Notification(
            user_id=u.id, type=NotificationType.ANNOUNCEMENT,
            title=title, message=message,
        )
        for u in users
    ])
    db.commit()

    return success_response(message=f"Announcement sent to {len(users)} users")


@router.get("/reports/users", summary="Download users report as CSV")
async def download_users_report(
    current_user=Depends(get_admin_user),
    db:          Session = Depends(get_db),
):
    users  = db.query(User).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "First Name", "Last Name", "Email", "Phone",
        "Role", "Status", "KYC Approved", "Country", "Created At",
    ])
    for u in users:
        writer.writerow([
            str(u.id), u.first_name, u.last_name, u.email,
            u.phone or "", u.role, u.status, u.kyc_approved,
            u.country or "", u.created_at,
        ])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=afritide-users-report.csv"}
    )
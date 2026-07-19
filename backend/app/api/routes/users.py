"""
Afritide - Users Routes
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from typing import Optional
from datetime import datetime
import uuid

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_admin_user, get_pagination, PaginationParams
from app.core.responses import success_response, paginated_response
from app.models.user import User, UserStatus
from app.models.product import Product, ProductStatus
from app.schemas.user import UserUpdateSchema, UserPublicSchema, UserProfileSchema
from app.services.cloudinary import upload_image

router = APIRouter()


@router.get("/profile/{user_id}", summary="Get public user profile")
async def get_user_profile(user_id: uuid.UUID, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id, User.status != UserStatus.BANNED).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return success_response(data=UserPublicSchema.model_validate(user).model_dump(mode="json"))


@router.get("/me", summary="Get my profile")
async def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return success_response(
        data=UserProfileSchema.model_validate(current_user).model_dump(mode="json")
    )


@router.put("/me", summary="Update my profile")
async def update_profile(
    payload:      UserUpdateSchema,
    current_user: User = Depends(get_current_user),
    db:           Session = Depends(get_db),
):
    update_data = payload.model_dump(exclude_unset=True)

    if update_data.get("kyc_submitted") is True and not current_user.kyc_submitted:
        update_data["kyc_submitted_at"] = datetime.utcnow()

    for field, value in update_data.items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return success_response(
        data=UserProfileSchema.model_validate(current_user).model_dump(mode="json"),
        message="Profile updated successfully",
    )


@router.post("/me/avatar", summary="Upload profile avatar")
async def upload_avatar(
    file:         UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db:           Session = Depends(get_db),
):
    url = await upload_image(file, folder="avatars")
    if not url:
        raise HTTPException(status_code=400, detail="Image upload failed")
    current_user.profile_image = url
    db.commit()
    return success_response(data={"profile_image": url}, message="Avatar updated")


@router.get("/me/wishlist", summary="Get my wishlisted products")
async def get_my_wishlist(
    pagination:   PaginationParams = Depends(get_pagination),
    current_user: User = Depends(get_current_user),
    db:           Session = Depends(get_db),
):
    from app.models.user import Wishlist
    from app.schemas.product import ProductResponseSchema
    query = db.query(Product).join(
        Wishlist, Wishlist.product_id == Product.id
    ).filter(
        Wishlist.user_id == current_user.id,
        Product.status == ProductStatus.ACTIVE,
    ).order_by(desc(Wishlist.created_at))

    total    = query.count()
    products = query.offset(pagination.offset).limit(pagination.page_size).all()

    return paginated_response(
        data=[ProductResponseSchema.model_validate(p).model_dump(mode="json") for p in products],
        total=total, page=pagination.page, page_size=pagination.page_size,
    )


@router.get("/farmers", summary="List verified suppliers")
async def list_farmers(
    country:     Optional[str]  = None,
    role:        Optional[str]  = None,
    search:      Optional[str]  = None,
    is_featured: Optional[bool] = None,
    pagination:  PaginationParams = Depends(get_pagination),
    db:          Session = Depends(get_db),
):
    from app.models.user import UserRole

    all_supplier_roles = [
        UserRole.FARMER,
        UserRole.COOPERATIVE,
        UserRole.EXPORTER,
        UserRole.PROCESSING_COMPANY,
        UserRole.LOGISTICS_PROVIDER,
        UserRole.WAREHOUSE_OPERATOR,
    ]

    query = db.query(User).filter(User.status.in_([UserStatus.ACTIVE, UserStatus.VERIFIED]))

    if role and role != "all":
        try:
            role_enum = UserRole(role)
            query = query.filter(User.role == role_enum)
        except ValueError:
            query = query.filter(User.role.in_(all_supplier_roles))
    else:
        query = query.filter(User.role.in_(all_supplier_roles))

    if country:
        query = query.filter(User.country.ilike(f"%{country}%"))
    if search:
        query = query.filter(or_(
            User.first_name.ilike(f"%{search}%"),
            User.last_name.ilike(f"%{search}%"),
            User.business_name.ilike(f"%{search}%"),
        ))
    if is_featured is not None:
        query = query.filter(User.is_featured == is_featured)

    query = query.order_by(desc(User.is_featured), desc(User.rating_average))

    total = query.count()
    users = query.offset(pagination.offset).limit(pagination.page_size).all()

    return paginated_response(
        data=[UserPublicSchema.model_validate(u).model_dump(mode="json") for u in users],
        total=total, page=pagination.page, page_size=pagination.page_size,
    )


@router.get("/following", summary="Get suppliers I follow")
async def get_following(
    current_user: User = Depends(get_current_user),
    db:           Session = Depends(get_db),
):
    from app.models.user import FollowSupplier
    follows = db.query(FollowSupplier).filter(
        FollowSupplier.follower_id == current_user.id
    ).all()

    supplier_ids = [f.supplier_id for f in follows]
    suppliers    = db.query(User).filter(User.id.in_(supplier_ids)).all()

    return success_response(data=[{
        "id":              str(s.id),
        "display_name":    s.display_name,
        "role":            s.role.value,
        "profile_image":   s.profile_image,
        "country":         s.country,
        "rating_average":  s.rating_average,
        "badge":           s.badge.value,
        "followers_count": s.followers_count,
    } for s in suppliers])


@router.post("/{user_id}/follow", summary="Follow/unfollow a supplier")
async def toggle_follow(
    user_id:      uuid.UUID,
    current_user: User = Depends(get_current_user),
    db:           Session = Depends(get_db),
):
    from app.models.user import FollowSupplier

    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot follow yourself")

    supplier = db.query(User).filter(User.id == user_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    existing = db.query(FollowSupplier).filter(
        FollowSupplier.follower_id == current_user.id,
        FollowSupplier.supplier_id == user_id,
    ).first()

    if existing:
        db.delete(existing)
        supplier.followers_count     = max(0, (supplier.followers_count or 0) - 1)
        current_user.following_count = max(0, (current_user.following_count or 0) - 1)
        db.commit()
        return success_response(data={"following": False}, message="Unfollowed supplier")
    else:
        follow = FollowSupplier(follower_id=current_user.id, supplier_id=user_id)
        db.add(follow)
        supplier.followers_count     = (supplier.followers_count or 0) + 1
        current_user.following_count = (current_user.following_count or 0) + 1
        db.commit()
        return success_response(data={"following": True}, message="Now following supplier")
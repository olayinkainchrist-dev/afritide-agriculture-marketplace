"""
Afritide - Products Routes
Full CRUD with advanced filtering, search, and image upload
"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from typing import Optional, List
from datetime import datetime
import logging
import uuid
import re

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_farmer_user, get_optional_user, get_pagination, PaginationParams
from app.core.responses import success_response, paginated_response
from app.models.product import Product, ProductCategory, ProductStatus, ProductGrade
from app.models.user import User, Wishlist
from app.schemas.product import ProductCreateSchema, ProductUpdateSchema, ProductResponseSchema, ProductDetailSchema
from app.services.cloudinary import upload_image

logger = logging.getLogger(__name__)
router = APIRouter()


def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return f"{text}-{uuid.uuid4().hex[:6]}"


# ── PUBLIC ENDPOINTS ──────────────────────────────────────────────────────────

@router.get("", summary="List all products with filters")
async def list_products(
    category:        Optional[ProductCategory] = None,
    country:         Optional[str]             = None,
    state:           Optional[str]             = None,
    min_price:       Optional[float]           = None,
    max_price:       Optional[float]           = None,
    currency:        Optional[str]             = None,
    grade:           Optional[ProductGrade]    = None,
    is_organic:      Optional[bool]            = None,
    is_export_ready: Optional[bool]            = None,
    is_negotiable:   Optional[bool]            = None,
    is_featured:     Optional[bool]            = None,
    seller_id:       Optional[uuid.UUID]       = None,
    search:          Optional[str]             = None,
    sort_by:         str = Query(default="created_at", enum=["created_at","price","rating","views"]),
    sort_order:      str = Query(default="desc", enum=["asc","desc"]),
    pagination:      PaginationParams = Depends(get_pagination),
    db:              Session = Depends(get_db),
    current_user:    Optional[User] = Depends(get_optional_user),
):
    query = db.query(Product).filter(Product.status == ProductStatus.ACTIVE)

    if category:        query = query.filter(Product.category == category)
    if country:         query = query.filter(Product.country.ilike(f"%{country}%"))
    if state:           query = query.filter(Product.state.ilike(f"%{state}%"))
    if min_price is not None: query = query.filter(Product.price >= min_price)
    if max_price is not None: query = query.filter(Product.price <= max_price)
    if currency:        query = query.filter(Product.currency == currency)
    if grade:           query = query.filter(Product.grade == grade)
    if is_organic is not None:      query = query.filter(Product.is_organic == is_organic)
    if is_export_ready is not None: query = query.filter(Product.is_export_ready == is_export_ready)
    if is_negotiable is not None:   query = query.filter(Product.is_negotiable == is_negotiable)
    if is_featured is not None:     query = query.filter(Product.is_featured == is_featured)
    if seller_id:       query = query.filter(Product.seller_id == seller_id)
    if search:
        term = f"%{search}%"
        query = query.filter(or_(
            Product.title.ilike(term),
            Product.description.ilike(term),
            Product.short_description.ilike(term),
            Product.country.ilike(term),
        ))

    sort_col = {
        "created_at": Product.created_at,
        "price":      Product.price,
        "rating":     Product.rating_average,
        "views":      Product.view_count,
    }.get(sort_by, Product.created_at)

    query = query.order_by(desc(sort_col) if sort_order == "desc" else asc(sort_col))
    total    = query.count()
    products = query.offset(pagination.offset).limit(pagination.page_size).all()

    return paginated_response(
        data=[ProductResponseSchema.model_validate(p).model_dump(mode="json") for p in products],
        total=total, page=pagination.page, page_size=pagination.page_size,
    )


@router.get("/featured", summary="Get featured products")
async def get_featured_products(
    limit: int = Query(default=12, le=50),
    db:    Session = Depends(get_db),
):
    products = db.query(Product).filter(
        Product.status == ProductStatus.ACTIVE,
        Product.is_featured == True,
    ).order_by(desc(Product.view_count)).limit(limit).all()

    return success_response(
        data=[ProductResponseSchema.model_validate(p).model_dump(mode="json") for p in products],
        message=f"{len(products)} featured products",
    )


@router.get("/category/{category}", summary="Get products by category")
async def get_products_by_category(
    category:   ProductCategory,
    pagination: PaginationParams = Depends(get_pagination),
    db:         Session = Depends(get_db),
):
    query = db.query(Product).filter(
        Product.status == ProductStatus.ACTIVE,
        Product.category == category,
    ).order_by (Product.is_sponsored),(desc(Product.is_featured), desc(Product.created_at))

    total    = query.count()
    products = query.offset(pagination.offset).limit(pagination.page_size).all()

    return paginated_response(
        data=[ProductResponseSchema.model_validate(p).model_dump(mode="json") for p in products],
        total=total, page=pagination.page, page_size=pagination.page_size,
    )


# ── UPLOAD ENDPOINTS — must be before /{product_id} ──────────────────────────

@router.post("/upload-image", summary="Upload a product image")
async def upload_product_image(
    file:         UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    url = await upload_image(file, folder="products")
    if not url:
        raise HTTPException(status_code=500, detail="Failed to upload image")

    return success_response(data={"url": url})


@router.post("/upload-video", summary="Upload a product video")
async def upload_product_video(
    file:         UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="File must be a video")

    contents = await file.read()
    if len(contents) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Video must be under 50MB")

    import cloudinary.uploader
    result = cloudinary.uploader.upload(
        contents,
        resource_type="video",
        folder="afritide/products/videos",
        public_id=f"product_video_{uuid.uuid4().hex[:8]}",
    )

    return success_response(data={"url": result["secure_url"]})


# ── SELLER ENDPOINTS ──────────────────────────────────────────────────────────

@router.get("/seller/my-products", summary="Get my product listings")
async def get_my_products(
    status:       Optional[ProductStatus] = None,
    pagination:   PaginationParams = Depends(get_pagination),
    current_user: User = Depends(get_farmer_user),
    db:           Session = Depends(get_db),
):
    query = db.query(Product).filter(Product.seller_id == current_user.id)
    if status:
        query = query.filter(Product.status == status)
    query = query.order_by(
    desc(Product.is_sponsored),
    desc(Product.is_featured),
    desc(Product.created_at))

    total    = query.count()
    products = query.offset(pagination.offset).limit(pagination.page_size).all()

    return paginated_response(
        data=[ProductResponseSchema.model_validate(p).model_dump(mode="json") for p in products],
        total=total, page=pagination.page, page_size=pagination.page_size,
    )


@router.post("", summary="Create a new product listing")
async def create_product(
    payload:      ProductCreateSchema,
    current_user: User = Depends(get_farmer_user),
    db:           Session = Depends(get_db),
):
    product = Product(
        seller_id=current_user.id,
        slug=slugify(payload.title),
        **payload.dict(exclude={"video_url", "delivery_options", "category_id"}),
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    logger.info(f"Product created: {product.title} by {current_user.email}")

    return success_response(
        data=ProductResponseSchema.model_validate(product).model_dump(mode="json"),
        message="Product submitted for review. It will be visible after approval.",
        status_code=201,
    )


@router.put("/{product_id}", summary="Update product listing")
async def update_product(
    product_id:   uuid.UUID,
    payload:      ProductUpdateSchema,
    current_user: User = Depends(get_farmer_user),
    db:           Session = Depends(get_db),
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.seller_id == current_user.id,
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    product.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(product)

    return success_response(
        data=ProductResponseSchema.model_validate(product).model_dump(mode="json"),
        message="Product updated successfully",
    )


@router.delete("/{product_id}", summary="Delete product listing")
async def delete_product(
    product_id:   uuid.UUID,
    current_user: User = Depends(get_current_user),
    db:           Session = Depends(get_db),
):
    from app.models.user import UserRole
    product = db.query(Product).filter(Product.id == product_id).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if product.seller_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="You do not own this product")

    product.status = ProductStatus.ARCHIVED
    db.commit()

    return success_response(message="Product removed successfully")


@router.get("/{product_id}", summary="Get product details")
async def get_product(
    product_id:   uuid.UUID,
    db:           Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    product = db.query(Product).filter(Product.id == product_id).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    is_owner = current_user is not None and product.seller_id == current_user.id

    if product.status != ProductStatus.ACTIVE and not is_owner:
        raise HTTPException(status_code=404, detail="Product not found")

    if product.status == ProductStatus.ACTIVE:
        product.view_count += 1
        db.commit()
        db.refresh(product)

    data = ProductDetailSchema.model_validate(product).model_dump(mode="json")

    from app.schemas.user import UserPublicSchema
    data["seller"] = UserPublicSchema.model_validate(product.seller).model_dump(mode="json")

    if current_user:
        is_wishlisted = db.query(Wishlist).filter(
            Wishlist.user_id == current_user.id,
            Wishlist.product_id == product.id,
        ).first()
        data["is_wishlisted"] = bool(is_wishlisted)

    return success_response(data=data)


@router.post("/{product_id}/images", summary="Upload product images")
async def upload_product_images(
    product_id:   uuid.UUID,
    files:        List[UploadFile] = File(...),
    current_user: User = Depends(get_farmer_user),
    db:           Session = Depends(get_db),
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.seller_id == current_user.id,
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    uploaded_urls = []
    for file in files[:10]:
        url = await upload_image(file, folder="products")
        if url:
            uploaded_urls.append(url)

    current_images  = product.images or []
    product.images  = current_images + uploaded_urls
    if not product.main_image and uploaded_urls:
        product.main_image = uploaded_urls[0]

    db.commit()

    return success_response(
        data={"images": product.images, "main_image": product.main_image},
        message=f"{len(uploaded_urls)} images uploaded successfully",
    )


@router.post("/{product_id}/wishlist", summary="Toggle product wishlist")
async def toggle_wishlist(
    product_id:   uuid.UUID,
    current_user: User = Depends(get_current_user),
    db:           Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing = db.query(Wishlist).filter(
        Wishlist.user_id == current_user.id,
        Wishlist.product_id == product_id,
    ).first()

    if existing:
        db.delete(existing)
        product.wishlist_count = max(0, product.wishlist_count - 1)
        db.commit()
        return success_response(data={"wishlisted": False}, message="Removed from wishlist")
    else:
        wishlist = Wishlist(user_id=current_user.id, product_id=product_id)
        db.add(wishlist)
        product.wishlist_count += 1
        db.commit()
        return success_response(data={"wishlisted": True}, message="Added to wishlist")
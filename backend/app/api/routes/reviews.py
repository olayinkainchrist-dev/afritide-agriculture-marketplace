"""
Afritide - Reviews Routes
Folder: backend/app/api/routes/reviews.py
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from datetime import datetime
import uuid

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_pagination, PaginationParams
from app.core.responses import success_response, paginated_response
from app.models.review import Review
from app.models.product import Product
from app.models.user import User
from app.schemas.common import ReviewCreateSchema, ReviewResponseSchema

router = APIRouter()


def _recalculate_product_rating(db: Session, product_id: uuid.UUID):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return
    result = db.query(
        func.avg(Review.overall_rating), func.count(Review.id)
    ).filter(Review.product_id == product_id, Review.is_approved == True).first()
    product.rating_average = round(result[0] or 0.0, 2)
    product.rating_count = result[1] or 0
    db.commit()


def _recalculate_user_rating(db: Session, user_id: uuid.UUID):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return
    result = db.query(
        func.avg(Review.overall_rating), func.count(Review.id)
    ).filter(Review.reviewee_id == user_id, Review.is_approved == True).first()
    user.rating_average = round(result[0] or 0.0, 2)
    user.rating_count = result[1] or 0
    db.commit()


@router.post("", summary="Submit a review")
async def create_review(
    payload: ReviewCreateSchema,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    is_verified = False
    if payload.order_id:
        from app.models.order import Order, OrderStatus
        order = db.query(Order).filter(
            Order.id == payload.order_id,
            Order.buyer_id == current_user.id,
            Order.status == OrderStatus.COMPLETED,
        ).first()
        is_verified = bool(order)

    review = Review(
        reviewer_id=current_user.id,
        reviewee_id=payload.reviewee_id,
        product_id=payload.product_id,
        order_id=payload.order_id,
        overall_rating=payload.overall_rating,
        quality_rating=payload.quality_rating,
        delivery_rating=payload.delivery_rating,
        communication_rating=payload.communication_rating,
        packaging_rating=payload.packaging_rating,
        title=payload.title,
        comment=payload.comment,
        is_verified_purchase=is_verified,
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    if payload.product_id:
        _recalculate_product_rating(db, payload.product_id)
    if payload.reviewee_id:
        _recalculate_user_rating(db, payload.reviewee_id)

    return success_response(
        data=ReviewResponseSchema.from_orm(review).dict(),
        message="Review submitted successfully",
        status_code=201,
    )


@router.get("/product/{product_id}", summary="Get reviews for a product")
async def get_product_reviews(
    product_id: uuid.UUID,
    pagination: PaginationParams = Depends(get_pagination),
    db: Session = Depends(get_db),
):
    query = db.query(Review).filter(
        Review.product_id == product_id, Review.is_approved == True
    ).order_by(desc(Review.created_at))

    total = query.count()
    reviews = query.offset(pagination.offset).limit(pagination.page_size).all()

    return paginated_response(
        data=[ReviewResponseSchema.from_orm(r).dict() for r in reviews],
        total=total, page=pagination.page, page_size=pagination.page_size,
    )


@router.get("/seller/{seller_id}", summary="Get reviews for a seller")
async def get_seller_reviews(
    seller_id: uuid.UUID,
    pagination: PaginationParams = Depends(get_pagination),
    db: Session = Depends(get_db),
):
    query = db.query(Review).filter(
        Review.reviewee_id == seller_id, Review.is_approved == True
    ).order_by(desc(Review.created_at))

    total = query.count()
    reviews = query.offset(pagination.offset).limit(pagination.page_size).all()

    return paginated_response(
        data=[ReviewResponseSchema.from_orm(r).dict() for r in reviews],
        total=total, page=pagination.page, page_size=pagination.page_size,
    )


@router.post("/{review_id}/reply", summary="Seller replies to a review")
async def reply_to_review(
    review_id: uuid.UUID,
    reply: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.reviewee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    review.seller_reply = reply
    review.seller_replied_at = datetime.utcnow()
    db.commit()

    return success_response(message="Reply added")

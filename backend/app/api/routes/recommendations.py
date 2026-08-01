"""
Afritide - Recommendations & Smart Search Engine
Phase 1: Behavioral tracking + trending + similar products
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_, text
from typing import Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
import uuid

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.responses import success_response
from app.models.product import Product, ProductStatus

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class TrackEventPayload(BaseModel):
    event_type:   str            # view, search, cart_add, wishlist, purchase
    product_id:   Optional[str] = None
    category:     Optional[str] = None
    search_query: Optional[str] = None
    session_id:   Optional[str] = None
    metadata:     Optional[dict] = {}


# ── Track Event ───────────────────────────────────────────────────────────────

@router.post("/track", summary="Track user behavior event")
async def track_event(
    payload:     TrackEventPayload,
    db:          Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    try:
        db.execute(text("""
            INSERT INTO user_events (user_id, session_id, event_type, product_id, category, search_query, metadata)
            VALUES (:user_id, :session_id, :event_type, :product_id, :category, :search_query, :metadata::jsonb)
        """), {
            "user_id":      str(current_user.id),
            "session_id":   payload.session_id,
            "event_type":   payload.event_type,
            "product_id":   payload.product_id,
            "category":     payload.category,
            "search_query": payload.search_query,
            "metadata":     str(payload.metadata or {}).replace("'", '"'),
        })
        db.commit()
    except Exception:
        pass  # Never fail on tracking
    return success_response(message="Event tracked")


# ── Trending Products ─────────────────────────────────────────────────────────

@router.get("/trending", summary="Get trending products (last 7 days)")
async def get_trending(
    limit:    int = Query(default=12, le=20),
    category: Optional[str] = None,
    db:       Session = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=7)

    # Get most viewed product IDs from events
    query = db.execute(text("""
        SELECT product_id, COUNT(*) as view_count
        FROM user_events
        WHERE event_type = 'view'
          AND product_id IS NOT NULL
          AND created_at >= :since
        GROUP BY product_id
        ORDER BY view_count DESC
        LIMIT :limit
    """), {"since": since, "limit": limit * 2})

    trending_ids = [str(row[0]) for row in query.fetchall()]

    if trending_ids:
        products = db.query(Product).filter(
            Product.id.in_(trending_ids),
            Product.status == ProductStatus.ACTIVE,
        ).all()
        # Sort by trending order
        id_order = {pid: i for i, pid in enumerate(trending_ids)}
        products = sorted(products, key=lambda p: id_order.get(str(p.id), 999))
    else:
        # Fallback to most viewed overall
        q = db.query(Product).filter(Product.status == ProductStatus.ACTIVE)
        if category:
            q = q.filter(Product.category == category)
        products = q.order_by(desc(Product.view_count)).limit(limit).all()

    if category:
        products = [p for p in products if p.category == category]

    products = products[:limit]

    return success_response(data=[{
        "id":             str(p.id),
        "title":          p.title,
        "price":          p.price,
        "currency":       p.currency,
        "main_image":     p.main_image,
        "category":       p.category,
        "unit":           p.unit,
        "rating_average": p.rating_average,
        "rating_count":   p.rating_count,
        "view_count":     p.view_count,
        "seller_id":      str(p.seller_id),
        "is_featured":    p.is_featured,
        "is_organic":     p.is_organic,
    } for p in products])


# ── Similar Products ──────────────────────────────────────────────────────────

@router.get("/similar/{product_id}", summary="Get similar products")
async def get_similar(
    product_id: uuid.UUID,
    limit:      int = Query(default=6, le=12),
    db:         Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return success_response(data=[])

    similar = db.query(Product).filter(
        Product.status   == ProductStatus.ACTIVE,
        Product.category == product.category,
        Product.id       != product_id,
        Product.seller_id != product.seller_id,
    ).order_by(
        desc(Product.rating_average),
        desc(Product.view_count),
    ).limit(limit).all()

    # If not enough, include same seller
    if len(similar) < limit:
        extra = db.query(Product).filter(
            Product.status   == ProductStatus.ACTIVE,
            Product.category == product.category,
            Product.id       != product_id,
            Product.id.notin_([p.id for p in similar]),
        ).order_by(desc(Product.view_count)).limit(limit - len(similar)).all()
        similar += extra

    return success_response(data=[{
        "id":             str(p.id),
        "title":          p.title,
        "price":          p.price,
        "currency":       p.currency,
        "main_image":     p.main_image,
        "category":       p.category,
        "unit":           p.unit,
        "rating_average": p.rating_average,
        "rating_count":   p.rating_count,
        "view_count":     p.view_count,
        "seller_id":      str(p.seller_id),
        "is_featured":    p.is_featured,
        "is_organic":     p.is_organic,
    } for p in similar])


# ── Personalized Recommendations ──────────────────────────────────────────────

@router.get("/for-you", summary="Personalized recommendations")
async def get_for_you(
    limit:       int = Query(default=12, le=20),
    db:          Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    # Get user's top categories from events
    result = db.execute(text("""
        SELECT category, COUNT(*) as cnt
        FROM user_events
        WHERE user_id = :user_id
          AND category IS NOT NULL
          AND event_type IN ('view', 'search', 'cart_add', 'purchase')
          AND created_at >= :since
        GROUP BY category
        ORDER BY cnt DESC
        LIMIT 3
    """), {
        "user_id": str(current_user.id),
        "since":   datetime.utcnow() - timedelta(days=30),
    })
    top_categories = [row[0] for row in result.fetchall()]

    # Get viewed product IDs to exclude
    viewed = db.execute(text("""
        SELECT DISTINCT product_id FROM user_events
        WHERE user_id = :user_id AND product_id IS NOT NULL
        LIMIT 50
    """), {"user_id": str(current_user.id)})
    viewed_ids = [row[0] for row in viewed.fetchall()]

    if top_categories:
        products = db.query(Product).filter(
            Product.status.in_([ProductStatus.ACTIVE]),
            Product.category.in_(top_categories),
            Product.id.notin_(viewed_ids) if viewed_ids else True,
        ).order_by(
            desc(Product.rating_average),
            desc(Product.view_count),
        ).limit(limit).all()
    else:
        # New user — show featured/trending
        products = db.query(Product).filter(
            Product.status == ProductStatus.ACTIVE,
        ).order_by(
            desc(Product.is_featured),
            desc(Product.view_count),
        ).limit(limit).all()

    return success_response(data=[{
        "id":             str(p.id),
        "title":          p.title,
        "price":          p.price,
        "currency":       p.currency,
        "main_image":     p.main_image,
        "category":       p.category,
        "unit":           p.unit,
        "rating_average": p.rating_average,
        "rating_count":   p.rating_count,
        "view_count":     p.view_count,
        "seller_id":      str(p.seller_id),
        "is_featured":    p.is_featured,
        "is_organic":     p.is_organic,
    } for p in products])


# ── Popular Searches ──────────────────────────────────────────────────────────

@router.get("/popular-searches", summary="Get popular search terms")
async def get_popular_searches(
    limit: int = Query(default=10, le=20),
    db:    Session = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=7)
    result = db.execute(text("""
        SELECT search_query, COUNT(*) as cnt
        FROM user_events
        WHERE event_type   = 'search'
          AND search_query IS NOT NULL
          AND search_query != ''
          AND created_at  >= :since
        GROUP BY search_query
        ORDER BY cnt DESC
        LIMIT :limit
    """), {"since": since, "limit": limit})

    searches = [row[0] for row in result.fetchall()]
    return success_response(data=searches)


# ── User Interest Profile ─────────────────────────────────────────────────────

@router.get("/my-profile", summary="Get my interest profile")
async def get_my_profile(
    db:          Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    since = datetime.utcnow() - timedelta(days=30)

    # Top categories
    cats = db.execute(text("""
        SELECT category, COUNT(*) as cnt
        FROM user_events
        WHERE user_id = :user_id AND category IS NOT NULL
          AND created_at >= :since
        GROUP BY category ORDER BY cnt DESC LIMIT 5
    """), {"user_id": str(current_user.id), "since": since})

    # Top searches
    searches = db.execute(text("""
        SELECT search_query, COUNT(*) as cnt
        FROM user_events
        WHERE user_id = :user_id AND search_query IS NOT NULL
          AND created_at >= :since
        GROUP BY search_query ORDER BY cnt DESC LIMIT 5
    """), {"user_id": str(current_user.id), "since": since})

    # Total events
    total = db.execute(text("""
        SELECT COUNT(*) FROM user_events
        WHERE user_id = :user_id AND created_at >= :since
    """), {"user_id": str(current_user.id), "since": since})

    return success_response(data={
        "top_categories":  [{"category": r[0], "count": r[1]} for r in cats.fetchall()],
        "top_searches":    [{"query": r[0], "count": r[1]} for r in searches.fetchall()],
        "total_events":    total.fetchone()[0],
    })
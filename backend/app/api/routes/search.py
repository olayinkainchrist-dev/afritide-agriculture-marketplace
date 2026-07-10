"""
Afritide - Global Search Routes
Folder: backend/app/api/routes/search.py
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from typing import Optional
import httpx

from app.core.database import get_db
from app.core.dependencies import get_pagination, PaginationParams
from app.core.responses import success_response, paginated_response
from app.models.product import Product, ProductStatus
from app.models.user import User, UserStatus, UserRole

router = APIRouter()


@router.get("", summary="Global search across products, farmers, and exporters")
async def global_search(
    q: str = Query(..., min_length=2, description="Search query"),
    type: Optional[str] = Query(default="all", enum=["all", "products", "farmers", "exporters"]),
    pagination: PaginationParams = Depends(get_pagination),
    db: Session = Depends(get_db),
):
    results = {"products": [], "farmers": [], "exporters": []}

    if type in ["all", "products"]:
        products = db.query(Product).filter(
            Product.status == ProductStatus.ACTIVE,
            or_(
                Product.title.ilike(f"%{q}%"),
                Product.description.ilike(f"%{q}%"),
                Product.farm_location.ilike(f"%{q}%"),
                Product.country.ilike(f"%{q}%"),
            ),
        ).order_by(desc(Product.is_featured), desc(Product.view_count)).limit(pagination.page_size).all()

        results["products"] = [
            {
                "id": str(p.id), "title": p.title, "price": p.price, "currency": p.currency,
                "main_image": p.main_image, "category": p.category, "country": p.country,
            } for p in products
        ]

    if type in ["all", "farmers"]:
        farmers = db.query(User).filter(
            User.status == UserStatus.ACTIVE,
            User.role.in_([UserRole.FARMER, UserRole.COOPERATIVE]),
            or_(
                User.first_name.ilike(f"%{q}%"),
                User.last_name.ilike(f"%{q}%"),
                User.farm_name.ilike(f"%{q}%"),
                User.business_name.ilike(f"%{q}%"),
                User.country.ilike(f"%{q}%"),
            ),
        ).limit(pagination.page_size).all()

        results["farmers"] = [
            {
                "id": str(f.id), "name": f.display_name, "farm_name": f.farm_name,
                "country": f.country, "rating_average": f.rating_average,
                "profile_image": f.profile_image,
            } for f in farmers
        ]

    if type in ["all", "exporters"]:
        exporters = db.query(User).filter(
            User.status == UserStatus.ACTIVE,
            User.role == UserRole.EXPORTER,
            or_(
                User.business_name.ilike(f"%{q}%"),
                User.country.ilike(f"%{q}%"),
            ),
        ).limit(pagination.page_size).all()

        results["exporters"] = [
            {
                "id": str(e.id), "name": e.display_name, "country": e.country,
                "rating_average": e.rating_average, "profile_image": e.profile_image,
            } for e in exporters
        ]

    return success_response(data=results, message=f"Search results for '{q}'")


@router.get("/autocomplete", summary="Search autocomplete suggestions")
async def autocomplete(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
):
    products = db.query(Product.title).filter(
        Product.status == ProductStatus.ACTIVE,
        Product.title.ilike(f"%{q}%"),
    ).distinct().limit(8).all()

    return success_response(data=[p[0] for p in products])


@router.get("/news", summary="Get agricultural market news")
async def get_market_news():
    """Proxy NewsAPI request through backend to avoid CORS on production"""
    try:
        api_key = "0c20cfce6dc144e89a61b5884bf9b867"
        url = (
            f"https://newsapi.org/v2/everything"
            f"?q=agriculture+africa+farming+commodities"
            f"&language=en"
            f"&sortBy=publishedAt"
            f"&pageSize=6"
            f"&apiKey={api_key}"
        )
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(url)
            data = res.json()
            if data.get("status") == "ok":
                return success_response(
                    data=data.get("articles", []),
                    message="Market news fetched successfully"
                )
            return success_response(data=[], message="No news available")
    except Exception as e:
        return success_response(data=[], message="News temporarily unavailable")
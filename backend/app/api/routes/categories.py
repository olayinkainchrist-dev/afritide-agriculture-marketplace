"""
Afritide - Categories Routes
Folder: backend/app/api/routes/categories.py
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import asc
import uuid

from app.core.database import get_db
from app.core.dependencies import get_admin_user
from app.core.responses import success_response
from app.models.product import Category

router = APIRouter()


@router.get("", summary="List all categories")
async def list_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).filter(Category.is_active == True).order_by(asc(Category.sort_order)).all()
    return success_response(data=[
        {
            "id": str(c.id), "name": c.name, "slug": c.slug,
            "description": c.description, "icon": c.icon, "image_url": c.image_url,
            "product_count": c.product_count, "parent_id": str(c.parent_id) if c.parent_id else None,
        } for c in categories
    ])


@router.get("/{slug}", summary="Get category by slug")
async def get_category(slug: str, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.slug == slug, Category.is_active == True).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return success_response(data={
        "id": str(category.id), "name": category.name, "slug": category.slug,
        "description": category.description, "icon": category.icon,
        "image_url": category.image_url, "product_count": category.product_count,
    })


@router.post("", summary="Create category (admin only)")
async def create_category(
    name: str, slug: str, description: str = None, icon: str = None,
    current_user=Depends(get_admin_user), db: Session = Depends(get_db),
):
    existing = db.query(Category).filter(Category.slug == slug).first()
    if existing:
        raise HTTPException(status_code=409, detail="Category slug already exists")

    category = Category(name=name, slug=slug, description=description, icon=icon)
    db.add(category)
    db.commit()
    db.refresh(category)
    return success_response(data={"id": str(category.id), "name": category.name}, status_code=201)


@router.delete("/{category_id}", summary="Delete category (admin only)")
async def delete_category(
    category_id: uuid.UUID,
    current_user=Depends(get_admin_user), db: Session = Depends(get_db),
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    category.is_active = False
    db.commit()
    return success_response(message="Category removed")

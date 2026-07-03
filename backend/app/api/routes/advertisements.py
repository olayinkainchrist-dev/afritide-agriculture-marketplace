"""
Afritide - Advertisements Routes
Folder: backend/app/api/routes/advertisements.py
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_admin_user
from app.core.responses import success_response
from app.models.advertisement import Advertisement, AdStatus, AdPlacement

router = APIRouter()


@router.get("/placement/{placement}", summary="Get active ads for a placement")
async def get_ads_by_placement(placement: AdPlacement, db: Session = Depends(get_db)):
    now = datetime.utcnow()
    ads = db.query(Advertisement).filter(
        Advertisement.placement == placement,
        Advertisement.status == AdStatus.ACTIVE,
    ).all()

    active_ads = [
        a for a in ads
        if (not a.starts_at or a.starts_at <= now) and (not a.ends_at or a.ends_at >= now)
    ]

    for ad in active_ads:
        ad.impressions += 1
    db.commit()

    return success_response(data=[
        {
            "id": str(a.id), "title": a.title, "description": a.description,
            "image_url": a.image_url, "target_url": a.target_url,
        } for a in active_ads
    ])


@router.post("/{ad_id}/click", summary="Track ad click")
async def track_click(ad_id: uuid.UUID, db: Session = Depends(get_db)):
    ad = db.query(Advertisement).filter(Advertisement.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Advertisement not found")
    ad.clicks += 1
    db.commit()
    return success_response(message="Click tracked")


@router.post("", summary="Submit an advertisement")
async def create_advertisement(
    title: str, image_url: str, target_url: str, placement: AdPlacement,
    description: str = None, budget: float = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ad = Advertisement(
        advertiser_id=current_user.id, title=title, description=description,
        image_url=image_url, target_url=target_url, placement=placement,
        budget=budget, status=AdStatus.PENDING,
    )
    db.add(ad)
    db.commit()
    db.refresh(ad)

    return success_response(
        data={"id": str(ad.id), "status": ad.status},
        message="Advertisement submitted for review",
        status_code=201,
    )


@router.put("/{ad_id}/approve", summary="Approve advertisement (admin)")
async def approve_ad(
    ad_id: uuid.UUID,
    current_user=Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    ad = db.query(Advertisement).filter(Advertisement.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Advertisement not found")
    ad.status = AdStatus.ACTIVE
    db.commit()
    return success_response(message="Advertisement approved and live")

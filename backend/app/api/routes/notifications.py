"""
Afritide - Notifications Routes
Folder: backend/app/api/routes/notifications.py
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
import uuid

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_pagination, PaginationParams
from app.core.responses import success_response, paginated_response
from app.models.notification import Notification
from app.schemas.common import NotificationResponseSchema

router = APIRouter()


@router.get("", summary="Get my notifications")
async def get_notifications(
    unread_only: bool = False,
    pagination: PaginationParams = Depends(get_pagination),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        query = query.filter(Notification.is_read == False)
    query = query.order_by(desc(Notification.created_at))

    total = query.count()
    notifications = query.offset(pagination.offset).limit(pagination.page_size).all()
    unread_count = db.query(Notification).filter(
        Notification.user_id == current_user.id, Notification.is_read == False
    ).count()

    return paginated_response(
        data=[NotificationResponseSchema.from_orm(n).dict() for n in notifications],
        total=total, page=pagination.page, page_size=pagination.page_size,
    )


@router.put("/{notification_id}/read", summary="Mark notification as read")
async def mark_as_read(
    notification_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notification = db.query(Notification).filter(
        Notification.id == notification_id, Notification.user_id == current_user.id
    ).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    notification.read_at = datetime.utcnow()
    db.commit()

    return success_response(message="Marked as read")


@router.put("/read-all", summary="Mark all notifications as read")
async def mark_all_as_read(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id, Notification.is_read == False
    ).update({"is_read": True, "read_at": datetime.utcnow()})
    db.commit()

    return success_response(message="All notifications marked as read")


@router.delete("/{notification_id}", summary="Delete a notification")
async def delete_notification(
    notification_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notification = db.query(Notification).filter(
        Notification.id == notification_id, Notification.user_id == current_user.id
    ).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    db.delete(notification)
    db.commit()

    return success_response(message="Notification deleted")

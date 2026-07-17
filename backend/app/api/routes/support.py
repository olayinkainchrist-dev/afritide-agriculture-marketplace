"""
Afritide - Support Routes
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from typing import Optional
import uuid

from app.core.database import get_db
from app.core.dependencies import get_admin_user, get_pagination, PaginationParams
from app.core.responses import success_response, paginated_response
from app.models.support import SupportTicket, TicketStatus
from app.services.email import send_support_notification, send_support_reply
from pydantic import BaseModel, EmailStr


router = APIRouter()


class SupportTicketCreate(BaseModel):
    name: str
    email: EmailStr
    topic: str
    message: str


class SupportReplySchema(BaseModel):
    reply: str


class EnterpriseInquiryPayload(BaseModel):
    full_name:      str
    email:          str
    phone:          Optional[str] = None
    company_name:   str
    role:           Optional[str] = None
    country:        Optional[str] = None
    monthly_volume: Optional[str] = None
    message:        str


@router.post("/contact", summary="Submit a support ticket")
async def submit_support_ticket(
    payload: SupportTicketCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    ticket = SupportTicket(
        name=payload.name,
        email=payload.email,
        topic=payload.topic,
        message=payload.message,
        status=TicketStatus.OPEN,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    background_tasks.add_task(
        send_support_notification,
        ticket.name,
        ticket.email,
        ticket.topic,
        ticket.message,
        str(ticket.id),
    )

    return success_response(
        data={"ticket_id": str(ticket.id)},
        message="Support ticket submitted successfully",
        status_code=201,
    )


@router.post("/enterprise-inquiry", summary="Submit enterprise inquiry")
async def enterprise_inquiry(
    payload: EnterpriseInquiryPayload,
    db: Session = Depends(get_db),
):
    try:
        from app.services.email import _send_email, _email_wrapper
        content = f"""
            <h2 style="color: #1A1A1A;">🏢 New Enterprise Inquiry</h2>
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px; color: #555;"><strong>Name:</strong></td><td style="padding: 8px;">{payload.full_name}</td></tr>
                <tr><td style="padding: 8px; color: #555;"><strong>Email:</strong></td><td style="padding: 8px;">{payload.email}</td></tr>
                <tr><td style="padding: 8px; color: #555;"><strong>Phone:</strong></td><td style="padding: 8px;">{payload.phone or '—'}</td></tr>
                <tr><td style="padding: 8px; color: #555;"><strong>Company:</strong></td><td style="padding: 8px;">{payload.company_name}</td></tr>
                <tr><td style="padding: 8px; color: #555;"><strong>Role:</strong></td><td style="padding: 8px;">{payload.role or '—'}</td></tr>
                <tr><td style="padding: 8px; color: #555;"><strong>Country:</strong></td><td style="padding: 8px;">{payload.country or '—'}</td></tr>
                <tr><td style="padding: 8px; color: #555;"><strong>Monthly Volume:</strong></td><td style="padding: 8px;">{payload.monthly_volume or '—'}</td></tr>
            </table>
            <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-top: 16px;">
                <p style="color: #333; font-size: 14px; margin: 0;">{payload.message}</p>
            </div>
        """
        _send_email("afritidegroup@gmail.com", f"[Enterprise] {payload.company_name} — {payload.full_name}", _email_wrapper(content))

        # Confirmation to user
        confirm = f"""
            <h2 style="color: #1A1A1A;">Thank you, {payload.full_name}! 🎉</h2>
            <p style="color: #555;">We've received your Enterprise inquiry for <strong>{payload.company_name}</strong>.</p>
            <p style="color: #555;">Our sales team will contact you within <strong>24 hours</strong>.</p>
            <p style="color: #555;">For urgent inquiries, WhatsApp us directly.</p>
        """
        _send_email(payload.email, "Afritide Enterprise — We'll be in touch!", _email_wrapper(confirm))
    except Exception:
        pass

    return success_response(message="Enterprise inquiry submitted successfully")


@router.get("/tickets", summary="Get all support tickets (admin only)")
async def get_all_tickets(
    status: TicketStatus = None,
    pagination: PaginationParams = Depends(get_pagination),
    current_user=Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    query = db.query(SupportTicket)
    if status:
        query = query.filter(SupportTicket.status == status)
    query = query.order_by(desc(SupportTicket.created_at))

    total = query.count()
    tickets = query.offset(pagination.offset).limit(pagination.page_size).all()

    return paginated_response(
        data=[{
            "id": str(t.id),
            "name": t.name,
            "email": t.email,
            "topic": t.topic,
            "message": t.message,
            "status": t.status,
            "admin_reply": t.admin_reply,
            "replied_at": t.replied_at.isoformat() if t.replied_at else None,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        } for t in tickets],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.put("/tickets/{ticket_id}/reply", summary="Reply to support ticket (admin only)")
async def reply_to_ticket(
    ticket_id: uuid.UUID,
    payload: SupportReplySchema,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.admin_reply = payload.reply
    ticket.status = TicketStatus.RESOLVED
    ticket.replied_at = datetime.utcnow()
    db.commit()

    background_tasks.add_task(
        send_support_reply,
        ticket.email,
        ticket.name,
        ticket.topic,
        payload.reply,
    )

    return success_response(message="Reply sent to user")


@router.put("/tickets/{ticket_id}/status", summary="Update ticket status (admin only)")
async def update_ticket_status(
    ticket_id: uuid.UUID,
    status: TicketStatus,
    current_user=Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.status = status
    db.commit()

    return success_response(message=f"Ticket status updated to {status}")

"""
Afritide - Support Chat Routes + WebSocket
"""
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, Dict, List
import uuid
import json
import html

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_admin_user
from app.core.responses import success_response
from app.models.support_chat import SupportConversation, SupportMessage
from app.models.user import User

router = APIRouter()

# ── WebSocket Connection Manager ─────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, conversation_id: str):
        await websocket.accept()
        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = []
        self.active_connections[conversation_id].append(websocket)

    def disconnect(self, websocket: WebSocket, conversation_id: str):
        if conversation_id in self.active_connections:
            self.active_connections[conversation_id].remove(websocket)
            if not self.active_connections[conversation_id]:
                del self.active_connections[conversation_id]

    async def broadcast(self, conversation_id: str, message: dict):
        if conversation_id in self.active_connections:
            dead = []
            for ws in self.active_connections[conversation_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.active_connections[conversation_id].remove(ws)

manager = ConnectionManager()


# ── Schemas ───────────────────────────────────────────────────────────────────

class SendMessagePayload(BaseModel):
    conversation_id: Optional[str] = None
    message:         Optional[str] = None
    attachment_url:  Optional[str] = None
    attachment_type: Optional[str] = None


# ── Helper ────────────────────────────────────────────────────────────────────

def serialize_message(msg: SupportMessage) -> dict:
    return {
        "id":              str(msg.id),
        "conversation_id": str(msg.conversation_id),
        "sender_type":     msg.sender_type,
        "message":         msg.message,
        "attachment_url":  msg.attachment_url,
        "attachment_type": msg.attachment_type,
        "is_read":         msg.is_read,
        "created_at":      msg.created_at.isoformat(),
    }


def serialize_conversation(conv: SupportConversation, db: Session) -> dict:
    user = db.query(User).filter(User.id == conv.user_id).first()
    last_msg = db.query(SupportMessage).filter(
        SupportMessage.conversation_id == conv.id
    ).order_by(desc(SupportMessage.created_at)).first()
    unread = db.query(SupportMessage).filter(
        SupportMessage.conversation_id == conv.id,
        SupportMessage.sender_type == "USER",
        SupportMessage.is_read == False,
    ).count()

    return {
        "id":         str(conv.id),
        "status":     conv.status,
        "created_at": conv.created_at.isoformat(),
        "updated_at": conv.updated_at.isoformat(),
        "closed_at":  conv.closed_at.isoformat() if conv.closed_at else None,
        "unread":     unread,
        "user": {
            "id":         str(user.id) if user else None,
            "first_name": user.first_name if user else "",
            "last_name":  user.last_name if user else "",
            "email":      user.email if user else "",
            "avatar_url": getattr(user, "avatar_url", None) if user else None,
        },
        "last_message": {
            "message":    last_msg.message if last_msg else None,
            "created_at": last_msg.created_at.isoformat() if last_msg else None,
            "sender_type":last_msg.sender_type if last_msg else None,
        } if last_msg else None,
    }


# ── User Endpoints ────────────────────────────────────────────────────────────

@router.get("/conversations/my", summary="Get my support conversation")
async def get_my_conversation(
    current_user = Depends(get_current_user),
    db: Session  = Depends(get_db),
):
    conv = db.query(SupportConversation).filter(
        SupportConversation.user_id == current_user.id,
        SupportConversation.status != "CLOSED",
    ).order_by(desc(SupportConversation.created_at)).first()

    if not conv:
        return success_response(data=None)

    messages = db.query(SupportMessage).filter(
        SupportMessage.conversation_id == conv.id
    ).order_by(SupportMessage.created_at).all()

    return success_response(data={
        "conversation": serialize_conversation(conv, db),
        "messages":     [serialize_message(m) for m in messages],
    })


@router.post("/conversations/start", summary="Start a support conversation")
async def start_conversation(
    current_user = Depends(get_current_user),
    db: Session  = Depends(get_db),
):
    # Check if open conversation exists
    existing = db.query(SupportConversation).filter(
        SupportConversation.user_id == current_user.id,
        SupportConversation.status == "OPEN",
    ).first()

    if existing:
        return success_response(data=serialize_conversation(existing, db))

    conv = SupportConversation(user_id=current_user.id, status="OPEN")
    db.add(conv)
    db.commit()
    db.refresh(conv)

    # Welcome message from admin
    welcome = SupportMessage(
        conversation_id = conv.id,
        sender_type     = "ADMIN",
        message         = "👋 Welcome to Afritide Support! How can we help you today?",
    )
    db.add(welcome)
    db.commit()

    return success_response(data=serialize_conversation(conv, db), status_code=201)


@router.post("/conversations/message", summary="Send a message")
async def send_message(
    payload:      SendMessagePayload,
    current_user= Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Sanitize message
    clean_message = html.escape(payload.message or "").strip() if payload.message else None
    if not clean_message and not payload.attachment_url:
        raise HTTPException(status_code=400, detail="Message or attachment required")

    # Get or create conversation
    conv_id = payload.conversation_id
    if conv_id:
        conv = db.query(SupportConversation).filter(
            SupportConversation.id == conv_id,
            SupportConversation.user_id == current_user.id,
        ).first()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conv = db.query(SupportConversation).filter(
            SupportConversation.user_id == current_user.id,
            SupportConversation.status == "OPEN",
        ).first()
        if not conv:
            conv = SupportConversation(user_id=current_user.id, status="OPEN")
            db.add(conv)
            db.commit()
            db.refresh(conv)

    msg = SupportMessage(
        conversation_id = conv.id,
        sender_type     = "USER",
        message         = clean_message,
        attachment_url  = payload.attachment_url,
        attachment_type = payload.attachment_type,
    )
    db.add(msg)
    conv.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(msg)

    # Broadcast via WebSocket
    await manager.broadcast(str(conv.id), {
        "type":    "new_message",
        "message": serialize_message(msg),
    })

    return success_response(data=serialize_message(msg), status_code=201)


@router.put("/conversations/close/{conversation_id}", summary="Close conversation")
async def close_conversation(
    conversation_id: uuid.UUID,
    current_user   = Depends(get_current_user),
    db: Session    = Depends(get_db),
):
    conv = db.query(SupportConversation).filter(
        SupportConversation.id == conversation_id,
        SupportConversation.user_id == current_user.id,
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv.status    = "CLOSED"
    conv.closed_at = datetime.utcnow()
    db.commit()
    return success_response(message="Conversation closed")


@router.post("/conversations/upload", summary="Upload attachment")
async def upload_attachment(
    file:        UploadFile = File(...),
    current_user= Depends(get_current_user),
):
    allowed_types = ["image/png", "image/jpeg", "image/jpg", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only PNG, JPEG, and PDF files are allowed")
    if file.size and file.size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File must be under 10MB")

    try:
        import supabase as sb
        import os
        client = sb.create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_KEY"],
        )
        ext      = file.filename.split(".")[-1]
        filename = f"support/{uuid.uuid4()}.{ext}"
        content  = await file.read()
        client.storage.from_("afritide-uploads").upload(filename, content, {"content-type": file.content_type})
        url = client.storage.from_("afritide-uploads").get_public_url(filename)
        attachment_type = "pdf" if file.content_type == "application/pdf" else "image"
        return success_response(data={"url": url, "type": attachment_type})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


# ── Admin Endpoints ───────────────────────────────────────────────────────────

@router.get("/admin/conversations", summary="Get all conversations (admin)")
async def get_all_conversations(
    status:      Optional[str] = None,
    current_user= Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    query = db.query(SupportConversation)
    if status:
        query = query.filter(SupportConversation.status == status.upper())
    convs = query.order_by(desc(SupportConversation.updated_at)).all()
    return success_response(data=[serialize_conversation(c, db) for c in convs])


@router.get("/admin/conversations/{conversation_id}", summary="Get conversation messages (admin)")
async def get_conversation_messages(
    conversation_id: uuid.UUID,
    current_user   = Depends(get_admin_user),
    db: Session    = Depends(get_db),
):
    conv = db.query(SupportConversation).filter(SupportConversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Mark user messages as read
    db.query(SupportMessage).filter(
        SupportMessage.conversation_id == conversation_id,
        SupportMessage.sender_type == "USER",
        SupportMessage.is_read == False,
    ).update({"is_read": True})
    db.commit()

    messages = db.query(SupportMessage).filter(
        SupportMessage.conversation_id == conversation_id
    ).order_by(SupportMessage.created_at).all()

    return success_response(data={
        "conversation": serialize_conversation(conv, db),
        "messages":     [serialize_message(m) for m in messages],
    })


@router.post("/admin/conversations/{conversation_id}/reply", summary="Admin reply")
async def admin_reply(
    conversation_id: uuid.UUID,
    payload:         SendMessagePayload,
    current_user   = Depends(get_admin_user),
    db: Session    = Depends(get_db),
):
    conv = db.query(SupportConversation).filter(SupportConversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    clean_message = html.escape(payload.message or "").strip() if payload.message else None
    if not clean_message and not payload.attachment_url:
        raise HTTPException(status_code=400, detail="Message or attachment required")

    msg = SupportMessage(
        conversation_id = conv.id,
        sender_type     = "ADMIN",
        message         = clean_message,
        attachment_url  = payload.attachment_url,
        attachment_type = payload.attachment_type,
        is_read         = True,
    )
    db.add(msg)
    conv.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(msg)

    await manager.broadcast(str(conv.id), {
        "type":    "new_message",
        "message": serialize_message(msg),
    })

    return success_response(data=serialize_message(msg), status_code=201)


@router.put("/admin/conversations/{conversation_id}/resolve", summary="Resolve conversation")
async def resolve_conversation(
    conversation_id: uuid.UUID,
    current_user   = Depends(get_admin_user),
    db: Session    = Depends(get_db),
):
    conv = db.query(SupportConversation).filter(SupportConversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv.status    = "RESOLVED"
    conv.closed_at = datetime.utcnow()
    db.commit()
    await manager.broadcast(str(conversation_id), {"type": "conversation_resolved"})
    return success_response(message="Conversation resolved")


@router.put("/admin/conversations/{conversation_id}/reopen", summary="Reopen conversation")
async def reopen_conversation(
    conversation_id: uuid.UUID,
    current_user   = Depends(get_admin_user),
    db: Session    = Depends(get_db),
):
    conv = db.query(SupportConversation).filter(SupportConversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv.status    = "OPEN"
    conv.closed_at = None
    db.commit()
    return success_response(message="Conversation reopened")


@router.delete("/admin/messages/{message_id}", summary="Delete message (admin)")
async def delete_message(
    message_id:  uuid.UUID,
    current_user= Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    msg = db.query(SupportMessage).filter(SupportMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    db.delete(msg)
    db.commit()
    return success_response(message="Message deleted")


@router.get("/admin/stats", summary="Get support stats (admin)")
async def get_support_stats(
    current_user= Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    total       = db.query(SupportConversation).count()
    open_count  = db.query(SupportConversation).filter(SupportConversation.status == "OPEN").count()
    resolved    = db.query(SupportConversation).filter(SupportConversation.status == "RESOLVED").count()
    closed      = db.query(SupportConversation).filter(SupportConversation.status == "CLOSED").count()
    unread      = db.query(SupportMessage).filter(
        SupportMessage.sender_type == "USER",
        SupportMessage.is_read == False,
    ).count()

    return success_response(data={
        "total":        total,
        "open":         open_count,
        "resolved":     resolved,
        "closed":       closed,
        "unread":       unread,
    })


# ── WebSocket ─────────────────────────────────────────────────────────────────

@router.websocket("/ws/{conversation_id}")
async def websocket_endpoint(
    websocket:       WebSocket,
    conversation_id: str,
    db: Session    = Depends(get_db),
):
    await manager.connect(websocket, conversation_id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                if payload.get("type") == "typing":
                    await manager.broadcast(conversation_id, {
                        "type":        "typing",
                        "sender_type": payload.get("sender_type", "USER"),
                    })
                elif payload.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, conversation_id)
        await manager.broadcast(conversation_id, {"type": "user_disconnected"})
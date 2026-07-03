"""
Afritide - Messages Routes
Folder: backend/app/api/routes/messages.py
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from datetime import datetime
import uuid

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_pagination, PaginationParams
from app.core.responses import success_response, paginated_response
from app.models.message import Conversation, Message
from app.schemas.common import MessageCreateSchema, MessageResponseSchema, ConversationResponseSchema

router = APIRouter()


def _get_or_create_conversation(db: Session, user_a: uuid.UUID, user_b: uuid.UUID, product_id: uuid.UUID = None) -> Conversation:
    convo = db.query(Conversation).filter(
        or_(
            and_(Conversation.participant_1_id == user_a, Conversation.participant_2_id == user_b),
            and_(Conversation.participant_1_id == user_b, Conversation.participant_2_id == user_a),
        )
    ).first()
    if not convo:
        convo = Conversation(participant_1_id=user_a, participant_2_id=user_b, product_id=product_id)
        db.add(convo)
        db.flush()
    return convo


@router.get("/conversations", summary="Get my conversations")
async def get_conversations(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversations = db.query(Conversation).filter(
        or_(
            Conversation.participant_1_id == current_user.id,
            Conversation.participant_2_id == current_user.id,
        )
    ).order_by(desc(Conversation.last_message_at)).all()

    data = []
    for c in conversations:
        other_id = c.participant_2_id if c.participant_1_id == current_user.id else c.participant_1_id
        last_msg = c.messages.order_by(desc(Message.created_at)).first()
        unread_count = c.messages.filter(
            Message.receiver_id == current_user.id, Message.is_read == False
        ).count()
        data.append({
            "conversation_id": str(c.id),
            "other_user_id": str(other_id),
            "product_id": str(c.product_id) if c.product_id else None,
            "last_message": last_msg.content if last_msg else None,
            "last_message_at": c.last_message_at,
            "unread_count": unread_count,
        })

    return success_response(data=data)


@router.get("/conversations/{conversation_id}", summary="Get messages in a conversation")
async def get_conversation_messages(
    conversation_id: uuid.UUID,
    pagination: PaginationParams = Depends(get_pagination),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if current_user.id not in [convo.participant_1_id, convo.participant_2_id]:
        raise HTTPException(status_code=403, detail="Access denied")

    query = convo.messages.order_by(desc(Message.created_at))
    total = query.count()
    messages = query.offset(pagination.offset).limit(pagination.page_size).all()

    # Mark as read
    convo.messages.filter(
        Message.receiver_id == current_user.id, Message.is_read == False
    ).update({"is_read": True, "read_at": datetime.utcnow()})
    db.commit()

    return paginated_response(
        data=[MessageResponseSchema.from_orm(m).dict() for m in messages],
        total=total, page=pagination.page, page_size=pagination.page_size,
    )


@router.post("", summary="Send a message")
async def send_message(
    payload: MessageCreateSchema,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.receiver_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")

    convo = _get_or_create_conversation(db, current_user.id, payload.receiver_id, payload.product_id)

    message = Message(
        conversation_id=convo.id,
        sender_id=current_user.id,
        receiver_id=payload.receiver_id,
        content=payload.content,
        attachments=payload.attachments,
    )
    db.add(message)
    convo.last_message_at = datetime.utcnow()
    db.commit()
    db.refresh(message)

    return success_response(
        data=MessageResponseSchema.from_orm(message).dict(),
        message="Message sent",
        status_code=201,
    )


@router.delete("/{message_id}", summary="Delete a message")
async def delete_message(
    message_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message.sender_id == current_user.id:
        message.is_deleted_by_sender = True
    elif message.receiver_id == current_user.id:
        message.is_deleted_by_receiver = True
    else:
        raise HTTPException(status_code=403, detail="Access denied")

    db.commit()
    return success_response(message="Message deleted")

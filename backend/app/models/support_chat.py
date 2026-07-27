"""
Afritide - Support Chat Models
"""
from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.core.database import Base


class ConversationStatus(str, enum.Enum):
    OPEN     = "OPEN"
    RESOLVED = "RESOLVED"
    CLOSED   = "CLOSED"


class SenderType(str, enum.Enum):
    USER  = "USER"
    ADMIN = "ADMIN"


class SupportConversation(Base):
    __tablename__ = "support_conversations"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status     = Column(String(20), default="OPEN", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    closed_at  = Column(DateTime, nullable=True)

    messages = relationship("SupportMessage", back_populates="conversation", cascade="all, delete-orphan")
    user     = relationship("User", foreign_keys=[user_id])


class SupportMessage(Base):
    __tablename__ = "support_messages"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("support_conversations.id", ondelete="CASCADE"), nullable=False)
    sender_type     = Column(String(10), nullable=False)
    message         = Column(Text, nullable=True)
    attachment_url  = Column(String(500), nullable=True)
    attachment_type = Column(String(20), nullable=True)
    is_read         = Column(Boolean, default=False, nullable=False)
    created_at      = Column(DateTime, default=datetime.utcnow, nullable=False)

    conversation = relationship("SupportConversation", back_populates="messages")
"""
Afritide - Certificate Model
Export documentation, compliance certificates
"""

from sqlalchemy import Column, String, Boolean, DateTime, Enum, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
import enum

from app.core.database import Base


class CertificateType(str, enum.Enum):
    PHYTOSANITARY = "phytosanitary"
    CERTIFICATE_OF_ORIGIN = "certificate_of_origin"
    SON = "son"                    # Standards Organisation of Nigeria
    NAFDAC = "nafdac"
    EXPORT_PERMIT = "export_permit"
    QUALITY_REPORT = "quality_report"
    INSPECTION_REPORT = "inspection_report"
    ORGANIC_CERTIFICATION = "organic_certification"
    HALAL = "halal"
    ISO = "iso"
    HACCP = "haccp"
    OTHER = "other"


class CertificateStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(Enum(CertificateType), nullable=False)
    status = Column(Enum(CertificateStatus), default=CertificateStatus.PENDING)
    certificate_number = Column(String(100), nullable=True)
    issuing_authority = Column(String(255), nullable=True)
    issue_date = Column(DateTime, nullable=True)
    expiry_date = Column(DateTime, nullable=True)
    document_url = Column(String(500), nullable=False)
    notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    verified_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id], back_populates="certificates")
    verifier = relationship("User", foreign_keys=[verified_by])

    def __repr__(self):
        return f"<Certificate {self.type} for {self.user_id}>"

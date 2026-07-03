"""
Afritide - Certificates & Export Documentation Routes
Folder: backend/app/api/routes/certificates.py
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_admin_user
from app.core.responses import success_response
from app.models.certificate import Certificate, CertificateType, CertificateStatus
from app.schemas.common import CertificateResponseSchema
from app.services.cloudinary import upload_document
from app.services.email import send_kyc_status_email

router = APIRouter()


@router.post("", summary="Upload a certificate/document")
async def upload_certificate(
    type: CertificateType = Form(...),
    certificate_number: str = Form(None),
    issuing_authority: str = Form(None),
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    url = await upload_document(file, folder="certificates")
    if not url:
        raise HTTPException(status_code=400, detail="Document upload failed")

    certificate = Certificate(
        user_id=current_user.id,
        type=type,
        certificate_number=certificate_number,
        issuing_authority=issuing_authority,
        document_url=url,
        status=CertificateStatus.PENDING,
    )
    db.add(certificate)
    db.commit()
    db.refresh(certificate)

    return success_response(
        data=CertificateResponseSchema.from_orm(certificate).dict(),
        message="Certificate uploaded and pending review",
        status_code=201,
    )


@router.get("/my-certificates", summary="Get my uploaded certificates")
async def get_my_certificates(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    certificates = db.query(Certificate).filter(Certificate.user_id == current_user.id).all()
    return success_response(data=[CertificateResponseSchema.from_orm(c).dict() for c in certificates])


@router.get("/pending", summary="Get pending certificates for review (admin)")
async def get_pending_certificates(
    current_user=Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    certificates = db.query(Certificate).filter(Certificate.status == CertificateStatus.PENDING).all()
    return success_response(data=[
        {
            "id": str(c.id), "user_id": str(c.user_id), "type": c.type,
            "certificate_number": c.certificate_number, "document_url": c.document_url,
            "created_at": c.created_at,
        } for c in certificates
    ])


@router.put("/{certificate_id}/review", summary="Approve or reject certificate (admin)")
async def review_certificate(
    certificate_id: uuid.UUID,
    approved: bool,
    rejection_reason: str = None,
    current_user=Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    certificate = db.query(Certificate).filter(Certificate.id == certificate_id).first()
    if not certificate:
        raise HTTPException(status_code=404, detail="Certificate not found")

    certificate.status = CertificateStatus.APPROVED if approved else CertificateStatus.REJECTED
    certificate.rejection_reason = rejection_reason if not approved else None
    certificate.verified_by = current_user.id
    certificate.verified_at = datetime.utcnow()
    db.commit()

    return success_response(message=f"Certificate {'approved' if approved else 'rejected'}")

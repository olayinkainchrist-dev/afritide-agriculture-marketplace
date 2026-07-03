"""
Afritide - Cloudinary Image Upload Service
Folder: backend/app/services/cloudinary.py
"""

import cloudinary
import cloudinary.uploader
from fastapi import UploadFile
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

if settings.CLOUDINARY_CLOUD_NAME:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


async def upload_image(file: UploadFile, folder: str = "afritide") -> str | None:
    """Upload an image file to Cloudinary and return the secure URL."""
    if not settings.CLOUDINARY_CLOUD_NAME:
        logger.warning("Cloudinary not configured - skipping upload")
        return None

    if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
        logger.warning(f"Rejected upload - invalid type: {file.content_type}")
        return None

    try:
        contents = await file.read()
        result = cloudinary.uploader.upload(
            contents,
            folder=f"afritide/{folder}",
            resource_type="image",
            transformation=[{"quality": "auto", "fetch_format": "auto"}],
        )
        return result.get("secure_url")
    except Exception as e:
        logger.error(f"Cloudinary upload failed: {e}")
        return None
    finally:
        await file.close()


async def upload_document(file: UploadFile, folder: str = "documents") -> str | None:
    """Upload a PDF/document file to Cloudinary and return the secure URL."""
    if not settings.CLOUDINARY_CLOUD_NAME:
        logger.warning("Cloudinary not configured - skipping upload")
        return None

    try:
        contents = await file.read()
        result = cloudinary.uploader.upload(
            contents,
            folder=f"afritide/{folder}",
            resource_type="raw",
        )
        return result.get("secure_url")
    except Exception as e:
        logger.error(f"Cloudinary document upload failed: {e}")
        return None
    finally:
        await file.close()


def delete_image(public_id: str) -> bool:
    try:
        cloudinary.uploader.destroy(public_id)
        return True
    except Exception as e:
        logger.error(f"Cloudinary delete failed: {e}")
        return False

"""
Afritide - Storage Service
Handles file uploads to Supabase Storage
"""
import os
import uuid
from typing import Optional


async def upload_file(filename: str, content: bytes, content_type: str) -> str:
    """Upload file to Supabase storage and return public URL."""
    try:
        import supabase as sb
        client = sb.create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_KEY"],
        )
        client.storage.from_("afritide-uploads").upload(
            filename, content, {"content-type": content_type}
        )
        url = client.storage.from_("afritide-uploads").get_public_url(filename)
        return url
    except Exception as e:
        raise Exception(f"Storage upload failed: {str(e)}")
"""
Afritide - Storage Service
Handles file uploads to Supabase Storage via REST API
"""
import os
import httpx


async def upload_file(filename: str, content: bytes, content_type: str) -> str:
    """Upload file to Supabase storage and return public URL."""
    supabase_url = os.environ.get("SUPABASE_URL", "")
    service_key  = os.environ.get("SUPABASE_SERVICE_KEY", "")
    bucket       = "afritide-uploads"

    upload_url = f"{supabase_url}/storage/v1/object/{bucket}/{filename}"

    async with httpx.AsyncClient() as client:
        res = await client.post(
            upload_url,
            content=content,
            headers={
                "Authorization": f"Bearer {service_key}",
                "Content-Type":  content_type,
                "apikey":        service_key,
            },
        )
        if res.status_code not in (200, 201):
            raise Exception(f"Upload failed: {res.text}")

    public_url = f"{supabase_url}/storage/v1/object/public/{bucket}/{filename}"
    return public_url
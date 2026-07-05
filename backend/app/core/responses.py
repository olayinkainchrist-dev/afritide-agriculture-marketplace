"""
Afritide - Standard API Response Helpers
"""

from typing import Any, Optional
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
import math


def success_response(
    data: Any = None,
    message: str = "Success",
    status_code: int = 200,
) -> dict:
    return JSONResponse(
        status_code=status_code,
        content=jsonable_encoder({
            "success": True,
            "message": message,
            "data": data,
        }),
    )


def error_response(
    message: str = "An error occurred",
    status_code: int = 400,
    errors: Any = None,
) -> dict:
    return JSONResponse(
        status_code=status_code,
        content=jsonable_encoder({
            "success": False,
            "message": message,
            "errors": errors,
            "data": None,
        }),
    )


def paginated_response(
    data: list,
    total: int,
    page: int,
    page_size: int,
    message: str = "Success",
) -> dict:
    total_pages = math.ceil(total / page_size) if page_size > 0 else 0
    return JSONResponse(
        status_code=200,
        content=jsonable_encoder({
            "success": True,
            "message": message,
            "data": data,
            "pagination": {
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1,
            },
        }),
    )
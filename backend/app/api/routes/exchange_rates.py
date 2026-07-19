"""
Afritide - Exchange Rate Routes
"""
from fastapi import APIRouter
from app.core.responses import success_response
from app.services.exchange_rate import get_rates_for_frontend, get_exchange_rates
from datetime import datetime

router = APIRouter()


@router.get("", summary="Get current exchange rates relative to NGN")
async def get_exchange_rates_endpoint():
    rates = await get_exchange_rates()
    frontend_rates = {
        currency: round(1 / rate, 6) if rate > 0 else 0
        for currency, rate in rates.items()
        if currency in ["USD", "GBP", "EUR", "GHS", "KES", "ZAR", "CAD", "AUD"]
    }
    return success_response(data={
        "base":      "NGN",
        "rates":     frontend_rates,
        "updated_at": datetime.utcnow().isoformat(),
    })
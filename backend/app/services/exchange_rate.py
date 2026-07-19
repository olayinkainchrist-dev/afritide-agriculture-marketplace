"""
Afritide - Exchange Rate Service
Fetches and caches live exchange rates
"""
import httpx
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Optional

# Cache storage
_cache: Dict[str, float] = {}
_cache_time: Optional[datetime] = None
CACHE_DURATION = timedelta(hours=1)

BASE_CURRENCY = "NGN"

# Free tier — no API key needed
EXCHANGE_RATE_URL = "https://open.er-api.com/v6/latest/NGN"


async def get_exchange_rates() -> Dict[str, float]:
    """Fetch rates with 1-hour cache. Returns rates relative to NGN."""
    global _cache, _cache_time

    if _cache and _cache_time and datetime.utcnow() - _cache_time < CACHE_DURATION:
        return _cache

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(EXCHANGE_RATE_URL)
            if res.status_code == 200:
                data = res.json()
                if data.get("result") == "success":
                    _cache      = data["rates"]
                    _cache_time = datetime.utcnow()
                    return _cache
    except Exception:
        pass

    # Fallback rates if API fails
    if _cache:
        return _cache

    return {
        "NGN": 1.0,
        "USD": 0.00065,
        "GBP": 0.00051,
        "EUR": 0.00060,
        "GHS": 0.0079,
        "KES": 0.084,
        "ZAR": 0.012,
    }


async def convert(amount: float, from_currency: str, to_currency: str) -> tuple[float, float]:
    """
    Convert amount from one currency to another.
    Returns (converted_amount, exchange_rate used)
    """
    if from_currency == to_currency:
        return amount, 1.0

    rates = await get_exchange_rates()

    # Rates are relative to NGN
    if from_currency == "NGN":
        rate = rates.get(to_currency, 1.0)
        return round(amount * rate, 2), rate
    elif to_currency == "NGN":
        rate = rates.get(from_currency, 1.0)
        if rate == 0:
            return amount, 1.0
        ngn_amount = amount / rate
        return round(ngn_amount, 2), rate
    else:
        # Convert via NGN
        from_rate = rates.get(from_currency, 1.0)
        to_rate   = rates.get(to_currency, 1.0)
        if from_rate == 0:
            return amount, 1.0
        ngn_amount       = amount / from_rate
        converted_amount = ngn_amount * to_rate
        exchange_rate    = to_rate / from_rate
        return round(converted_amount, 2), round(exchange_rate, 6)


async def get_rates_for_frontend() -> Dict[str, float]:
    """Return rates in a format useful for frontend display."""
    rates = await get_exchange_rates()
    return {
        currency: round(1 / rate, 4) if rate > 0 else 0
        for currency, rate in rates.items()
        if currency in ["USD", "GBP", "EUR", "GHS", "KES", "ZAR", "NGN"]
    }
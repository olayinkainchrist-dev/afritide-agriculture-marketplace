"""
Afritide - Logistics Engine
Zone-based domestic pricing + international estimates
"""
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, Dict, Any


# Shipping profile mapping from product category
CATEGORY_TO_PROFILE = {
    "LIVESTOCK":   "LIVESTOCK",
    "POULTRY":     "LIVESTOCK",
    "DAIRY":       "FRESH_PRODUCE",
    "FISHERY":     "FRESH_PRODUCE",
    "FRUITS":      "FRESH_PRODUCE",
    "VEGETABLES":  "FRESH_PRODUCE",
    "CASH_CROPS":  "DRY_PRODUCE",
    "SEEDS":       "DRY_PRODUCE",
    "FERTILIZERS": "DRY_PRODUCE",
    "MACHINERY":   "DRY_PRODUCE",
}

# International shipping estimates (NGN) by weight band and method
INTERNATIONAL_ESTIMATES = {
    "WEST_AFRICA": {
        "description": "Ghana, Benin, Togo, Ivory Coast, Senegal",
        "bands": [
            {"min": 0,     "max": 25,    "method": "Courier",   "min_cost": 25000,   "max_cost": 45000,   "days": "3-7"},
            {"min": 25,    "max": 70,    "method": "Courier",   "min_cost": 60000,   "max_cost": 90000,   "days": "5-10"},
            {"min": 70,    "max": 500,   "method": "Air Cargo", "min_cost": 180000,  "max_cost": 280000,  "days": "5-10"},
            {"min": 500,   "max": 2000,  "method": "Road",      "min_cost": 350000,  "max_cost": 550000,  "days": "3-7"},
            {"min": 2000,  "max": 20000, "method": "Road/Sea",  "min_cost": 800000,  "max_cost": 1500000, "days": "7-14"},
        ]
    },
    "EAST_AFRICA": {
        "description": "Kenya, Ethiopia, Tanzania, Uganda",
        "bands": [
            {"min": 0,     "max": 25,    "method": "Courier",   "min_cost": 45000,   "max_cost": 75000,   "days": "5-10"},
            {"min": 25,    "max": 70,    "method": "Courier",   "min_cost": 90000,   "max_cost": 140000,  "days": "7-14"},
            {"min": 70,    "max": 500,   "method": "Air Cargo", "min_cost": 280000,  "max_cost": 420000,  "days": "5-10"},
            {"min": 500,   "max": 2000,  "method": "Sea/Air",   "min_cost": 600000,  "max_cost": 950000,  "days": "10-21"},
            {"min": 2000,  "max": 20000, "method": "Sea",       "min_cost": 1200000, "max_cost": 2200000, "days": "14-28"},
        ]
    },
    "EUROPE": {
        "description": "UK, Germany, France, Netherlands",
        "bands": [
            {"min": 0,     "max": 25,    "method": "Courier",   "min_cost": 65000,   "max_cost": 110000,  "days": "3-7"},
            {"min": 25,    "max": 70,    "method": "Courier",   "min_cost": 140000,  "max_cost": 220000,  "days": "5-10"},
            {"min": 70,    "max": 500,   "method": "Air Cargo", "min_cost": 450000,  "max_cost": 700000,  "days": "3-7"},
            {"min": 500,   "max": 2000,  "method": "Air/Sea",   "min_cost": 900000,  "max_cost": 1500000, "days": "7-35"},
            {"min": 2000,  "max": 20000, "method": "Sea (LCL)", "min_cost": 1800000, "max_cost": 3200000, "days": "25-40"},
            {"min": 20000, "max": 99999, "method": "Sea (FCL)", "min_cost": 3500000, "max_cost": 6000000, "days": "28-45"},
        ]
    },
    "NORTH_AMERICA": {
        "description": "USA, Canada",
        "bands": [
            {"min": 0,     "max": 25,    "method": "Courier",   "min_cost": 75000,   "max_cost": 130000,  "days": "5-10"},
            {"min": 25,    "max": 70,    "method": "Courier",   "min_cost": 160000,  "max_cost": 260000,  "days": "7-14"},
            {"min": 70,    "max": 500,   "method": "Air Cargo", "min_cost": 520000,  "max_cost": 820000,  "days": "5-10"},
            {"min": 500,   "max": 2000,  "method": "Air/Sea",   "min_cost": 1100000, "max_cost": 1900000, "days": "10-40"},
            {"min": 2000,  "max": 20000, "method": "Sea (LCL)", "min_cost": 2200000, "max_cost": 4000000, "days": "30-45"},
            {"min": 20000, "max": 99999, "method": "Sea (FCL)", "min_cost": 4500000, "max_cost": 8000000, "days": "35-50"},
        ]
    },
    "MIDDLE_EAST": {
        "description": "UAE, Saudi Arabia, Qatar, Kuwait",
        "bands": [
            {"min": 0,     "max": 25,    "method": "Courier",   "min_cost": 45000,   "max_cost": 80000,   "days": "3-7"},
            {"min": 25,    "max": 70,    "method": "Courier",   "min_cost": 100000,  "max_cost": 160000,  "days": "5-10"},
            {"min": 70,    "max": 500,   "method": "Air Cargo", "min_cost": 320000,  "max_cost": 500000,  "days": "3-7"},
            {"min": 500,   "max": 2000,  "method": "Sea",       "min_cost": 650000,  "max_cost": 1100000, "days": "15-25"},
            {"min": 2000,  "max": 20000, "method": "Sea (LCL)", "min_cost": 1300000, "max_cost": 2400000, "days": "20-35"},
            {"min": 20000, "max": 99999, "method": "Sea (FCL)", "min_cost": 2600000, "max_cost": 4800000, "days": "25-40"},
        ]
    },
    "ASIA": {
        "description": "China, India, Pakistan, Bangladesh",
        "bands": [
            {"min": 0,     "max": 25,    "method": "Courier",   "min_cost": 55000,   "max_cost": 95000,   "days": "5-10"},
            {"min": 25,    "max": 70,    "method": "Courier",   "min_cost": 120000,  "max_cost": 190000,  "days": "7-14"},
            {"min": 70,    "max": 500,   "method": "Air Cargo", "min_cost": 380000,  "max_cost": 600000,  "days": "5-10"},
            {"min": 500,   "max": 2000,  "method": "Sea",       "min_cost": 750000,  "max_cost": 1300000, "days": "20-35"},
            {"min": 2000,  "max": 20000, "method": "Sea (LCL)", "min_cost": 1500000, "max_cost": 2800000, "days": "25-40"},
            {"min": 20000, "max": 99999, "method": "Sea (FCL)", "min_cost": 3000000, "max_cost": 5500000, "days": "30-45"},
        ]
    },
    "FAR_EAST": {
        "description": "Japan, South Korea, Australia, New Zealand",
        "bands": [
            {"min": 0,     "max": 25,    "method": "Courier",   "min_cost": 80000,   "max_cost": 140000,  "days": "7-14"},
            {"min": 25,    "max": 70,    "method": "Courier",   "min_cost": 180000,  "max_cost": 280000,  "days": "10-18"},
            {"min": 70,    "max": 500,   "method": "Air Cargo", "min_cost": 580000,  "max_cost": 950000,  "days": "7-14"},
            {"min": 500,   "max": 2000,  "method": "Sea",       "min_cost": 1200000, "max_cost": 2100000, "days": "30-45"},
            {"min": 2000,  "max": 20000, "method": "Sea (LCL)", "min_cost": 2400000, "max_cost": 4200000, "days": "35-50"},
            {"min": 20000, "max": 99999, "method": "Sea (FCL)", "min_cost": 4800000, "max_cost": 8500000, "days": "40-55"},
        ]
    },
}

COUNTRY_TO_REGION = {
    # West Africa
    "Ghana": "WEST_AFRICA", "Benin": "WEST_AFRICA", "Togo": "WEST_AFRICA",
    "Ivory Coast": "WEST_AFRICA", "Senegal": "WEST_AFRICA", "Mali": "WEST_AFRICA",
    "Burkina Faso": "WEST_AFRICA", "Sierra Leone": "WEST_AFRICA", "Guinea": "WEST_AFRICA",
    "Cameroon": "WEST_AFRICA", "Niger": "WEST_AFRICA",
    # East Africa
    "Kenya": "EAST_AFRICA", "Ethiopia": "EAST_AFRICA", "Tanzania": "EAST_AFRICA",
    "Uganda": "EAST_AFRICA", "Rwanda": "EAST_AFRICA", "Burundi": "EAST_AFRICA",
    "Somalia": "EAST_AFRICA", "Djibouti": "EAST_AFRICA", "Eritrea": "EAST_AFRICA",
    # Europe (expanded UK variations)
    "Uk": "EUROPE", "United Kingdom": "EUROPE", "Britain": "EUROPE", "England": "EUROPE",
    "Germany": "EUROPE", "France": "EUROPE", "Netherlands": "EUROPE", "Belgium": "EUROPE",
    "Spain": "EUROPE", "Italy": "EUROPE", "Portugal": "EUROPE",
    "Sweden": "EUROPE", "Norway": "EUROPE", "Denmark": "EUROPE",
    # North America (expanded US variations)
    "Usa": "NORTH_AMERICA", "United States": "NORTH_AMERICA", "United States Of America": "NORTH_AMERICA",
    "America": "NORTH_AMERICA", "Us": "NORTH_AMERICA", "Canada": "NORTH_AMERICA",
    # Middle East
    "Uae": "MIDDLE_EAST", "Saudi Arabia": "MIDDLE_EAST", "Qatar": "MIDDLE_EAST",
    "Kuwait": "MIDDLE_EAST", "Oman": "MIDDLE_EAST", "Bahrain": "MIDDLE_EAST",
    "Jordan": "MIDDLE_EAST", "Lebanon": "MIDDLE_EAST", "Egypt": "MIDDLE_EAST",
    # Asia (South Asia)
    "China": "ASIA", "India": "ASIA", "Pakistan": "ASIA", "Bangladesh": "ASIA",
    # Far East / Oceania
    "Japan": "FAR_EAST", "South Korea": "FAR_EAST", "Korea": "FAR_EAST",
    "Australia": "FAR_EAST", "New Zealand": "FAR_EAST", "Singapore": "FAR_EAST",
    "Malaysia": "FAR_EAST", "Indonesia": "FAR_EAST", "Thailand": "FAR_EAST",
    "Vietnam": "FAR_EAST", "Philippines": "FAR_EAST",
}


def get_shipping_profile(category: str) -> str:
    return CATEGORY_TO_PROFILE.get(category, "DRY_PRODUCE")


def calculate_total_weight(items: list) -> float:
    """Calculate total weight in kg from cart items."""
    total = 0.0
    for item in items:
        unit    = item.get("unit", "KG").upper()
        qty     = float(item.get("quantity", 1))
        wpunit  = float(item.get("weight_per_unit", 0) or 0)

        if wpunit > 0:
            total += qty * wpunit
        else:
            # Fallback weights by unit
            unit_weights = {
                "TONNE":  1000,
                "KG":     1,
                "GRAM":   0.001,
                "BAG":    50,    # avg 50kg bag
                "CRATE":  20,
                "DOZEN":  5,
                "BUNCH":  2,
                "HEAD":   350,   # avg livestock
                "PIECE":  5,
                "LITRE":  1,
                "UNIT":   1,
            }
            total += qty * unit_weights.get(unit, 1)
    return round(total, 2)


async def calculate_domestic_shipping(
    db:           Session,
    origin_state: str,
    dest_state:   str,
    weight_kg:    float,
    category:     str,
    country:      str = "Nigeria",
) -> Dict[str, Any]:
    """Calculate domestic shipping rate using zone table."""

    # Get zone
    zone_result = db.execute(text("""
        SELECT zone FROM shipping_zones
        WHERE country = :country
        AND LOWER(origin) = LOWER(:origin)
        AND LOWER(destination) = LOWER(:destination)
        LIMIT 1
    """), {"country": country, "origin": origin_state, "destination": dest_state}).fetchone()

    if not zone_result:
        # Default to Zone D if route not found
        zone = "D"
    else:
        zone = zone_result[0]

    profile = get_shipping_profile(category)

    # Get rate
    rate_result = db.execute(text("""
        SELECT rate_ngn FROM shipping_rates
        WHERE zone = :zone
        AND profile = :profile
        AND min_weight_kg <= :weight
        AND max_weight_kg >= :weight
        ORDER BY min_weight_kg ASC
        LIMIT 1
    """), {"zone": zone, "profile": profile, "weight": weight_kg}).fetchone()

    if not rate_result:
        # Fallback rate
        rate_ngn = weight_kg * 200
    else:
        rate_ngn = rate_result[0]

    return {
        "type":        "DOMESTIC",
        "zone":        zone,
        "profile":     profile,
        "weight_kg":   weight_kg,
        "rate_ngn":    rate_ngn,
        "currency":    "NGN",
        "is_estimate": False,
        "message":     f"Zone {zone} · {profile.replace('_', ' ').title()}",
    }


def get_international_estimate(
    dest_country: str,
    weight_kg:    float,
) -> Dict[str, Any]:
    """Get international shipping estimate."""
    # Clean and normalize country name for case-insensitive lookup
    dest_normalized = dest_country.strip().title()
    region = COUNTRY_TO_REGION.get(dest_normalized) or COUNTRY_TO_REGION.get(dest_country.strip())

    if not region:
        # Unknown country — generic estimate
        return {
            "type":        "INTERNATIONAL",
            "region":      "UNKNOWN",
            "weight_kg":   weight_kg,
            "min_cost":    weight_kg * 500,
            "max_cost":    weight_kg * 900,
            "method":      "Air/Sea Freight",
            "transit_days":"14-45 days",
            "currency":    "NGN",
            "is_estimate": True,
            "message":     "Estimated range — final cost confirmed at booking",
        }

    region_data = INTERNATIONAL_ESTIMATES[region]
    bands       = region_data["bands"]

    # Find matching band
    band = next(
        (b for b in bands if b["min"] <= weight_kg <= b["max"]),
        bands[-1]  # use last band if over max
    )

    return {
        "type":        "INTERNATIONAL",
        "region":      region,
        "description": region_data["description"],
        "weight_kg":   weight_kg,
        "min_cost":    band["min_cost"],
        "max_cost":    band["max_cost"],
        "method":      band["method"],
        "transit_days":band["days"],
        "currency":    "NGN",
        "is_estimate": True,
        "message":     f"Estimated {band['method']} · {band['days']} days · Final cost confirmed at booking",
    }


async def calculate_shipping(
    db:           Session,
    origin_state: str,
    dest_state:   str,
    dest_country: str,
    weight_kg:    float,
    category:     str,
) -> Dict[str, Any]:
    """Main shipping calculator — domestic or international."""
    dest_country_clean = dest_country.strip()
    is_domestic = dest_country_clean.lower() in ["nigeria", "ng"]

    if is_domestic:
        return await calculate_domestic_shipping(
            db=db,
            origin_state=origin_state,
            dest_state=dest_state,
            weight_kg=weight_kg,
            category=category,
        )
    else:
        return get_international_estimate(
            dest_country=dest_country_clean,
            weight_kg=weight_kg,
        )
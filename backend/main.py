"""
Afritide Agriculture Marketplace - Main Application Entry Point
Professional B2B/B2C Agricultural Trading Platform
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

from app.core.database import engine, Base
from app.core.config import settings

# Import all models to ensure they are registered with SQLAlchemy
from app.models import (
    user, product, order, payment,
    message, rfq, commodity, review, notification,
    logistics, warehouse, certificate, advertisement, analytics
)

# Import all routers
from app.api.routes import (
    auth, users, products, categories, orders,
    payments, messages, rfqs, commodities, reviews,
    notifications, logistics as logistics_router,
    warehouses, certificates, advertisements,
    analytics as analytics_router, admin, search
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown events"""
    logger.info("🌱 Afritide Agriculture Marketplace starting up...")
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Database tables created/verified")
    logger.info("🚀 Afritide is live!")
    yield
    logger.info("🔴 Afritide shutting down...")


app = FastAPI(
    title="Afritide Agriculture Marketplace API",
    description="""
    ## 🌍 Afritide Agriculture Marketplace
    
    **Connecting African Farmers to the World**
    
    A professional B2B/B2C agricultural trading platform enabling:
    - Verified farmers and exporters to list products
    - International and local buyers to source quality commodities
    - Real-time commodity pricing and market intelligence
    - Secure trade with escrow payments and logistics support
    
    ### Key Features
    - 🔐 Multi-role authentication (Buyer, Farmer, Exporter, Admin)
    - 📦 10+ product categories with rich listing details
    - 💬 Real-time messaging between buyers and sellers
    - 📊 Live commodity price board
    - 🤝 Request for Quotation (RFQ) system
    - 📍 Google Maps farm location integration
    - 🌐 Multi-currency support (USD, GBP, EUR, NGN, GHS, CFA)
    """,
    version="1.0.0",
    contact={
        "name": "SuperILM Technologies",
        "url": "https://superilmtech.com",
        "email": "dev@superilmtech.com",
    },
    license_info={
        "name": "Proprietary",
    },
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ── MIDDLEWARE ──────────────────────────────────────────────────────────────

app.add_middleware(GZipMiddleware, minimum_size=1000)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── ROUTERS ─────────────────────────────────────────────────────────────────

API_PREFIX = "/api/v1"

app.include_router(auth.router,             prefix=f"{API_PREFIX}/auth",            tags=["🔐 Authentication"])
app.include_router(users.router,            prefix=f"{API_PREFIX}/users",           tags=["👤 Users"])
app.include_router(products.router,         prefix=f"{API_PREFIX}/products",        tags=["📦 Products"])
app.include_router(categories.router,       prefix=f"{API_PREFIX}/categories",      tags=["🗂️ Categories"])
app.include_router(orders.router,           prefix=f"{API_PREFIX}/orders",          tags=["🛒 Orders"])
app.include_router(payments.router,         prefix=f"{API_PREFIX}/payments",        tags=["💳 Payments"])
app.include_router(messages.router,         prefix=f"{API_PREFIX}/messages",        tags=["💬 Messages"])
app.include_router(rfqs.router,             prefix=f"{API_PREFIX}/rfqs",            tags=["📋 RFQs"])
app.include_router(commodities.router,      prefix=f"{API_PREFIX}/commodities",     tags=["📈 Commodities"])
app.include_router(reviews.router,          prefix=f"{API_PREFIX}/reviews",         tags=["⭐ Reviews"])
app.include_router(notifications.router,    prefix=f"{API_PREFIX}/notifications",   tags=["🔔 Notifications"])
app.include_router(logistics_router.router, prefix=f"{API_PREFIX}/logistics",       tags=["🚚 Logistics"])
app.include_router(warehouses.router,       prefix=f"{API_PREFIX}/warehouses",      tags=["🏭 Warehouses"])
app.include_router(certificates.router,     prefix=f"{API_PREFIX}/certificates",    tags=["📜 Certificates"])
app.include_router(advertisements.router,   prefix=f"{API_PREFIX}/advertisements",  tags=["📢 Advertisements"])
app.include_router(analytics_router.router, prefix=f"{API_PREFIX}/analytics",       tags=["📊 Analytics"])
app.include_router(admin.router,            prefix=f"{API_PREFIX}/admin",           tags=["⚙️ Admin"])
app.include_router(search.router,           prefix=f"{API_PREFIX}/search",          tags=["🔍 Search"])


# ── HEALTH CHECK ────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    return {
        "platform": "Afritide Agriculture Marketplace",
        "tagline": "Connecting African Farmers to the World",
        "version": "1.0.0",
        "status": "🟢 Online",
        "docs": "/api/docs",
        "developer": "SuperILM Technologies",
    }


@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "platform": "Afritide",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }


# ── GLOBAL EXCEPTION HANDLER ────────────────────────────────────────────────

@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={"success": False, "message": "Resource not found", "data": None},
    )


@app.exception_handler(500)
async def server_error_handler(request, exc):
    logger.error(f"Internal server error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "Internal server error", "data": None},
    )

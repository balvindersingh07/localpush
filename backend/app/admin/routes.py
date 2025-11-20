# app/admin/routes.py

from fastapi import APIRouter
from app.admin.services import (
    get_dashboard_stats,
    get_latest_listings,
    get_payments_overview,
    get_payouts,
    get_full_dashboard,   # NEW IMPORT
)

admin_router = APIRouter()


# ---------- INDIVIDUAL APIs (KEEPING THEM AS IS) ----------
@admin_router.get("/stats")
def stats():
    return get_dashboard_stats()


@admin_router.get("/latest-listings")
def latest_listings():
    return get_latest_listings()


@admin_router.get("/payments-overview")
def payments_overview():
    return get_payments_overview()


@admin_router.get("/payouts")
def payouts():
    return get_payouts()


# ---------- NEW: SUPER API ----------
@admin_router.get("/dashboard")
def dashboard():
    """
    Single API that merges:
    - stats
    - latest listings
    - payments overview
    - payouts
    """
    return get_full_dashboard()

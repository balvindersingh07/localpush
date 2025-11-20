# app/admin/services.py

from bson import ObjectId
from datetime import datetime
from app.database import (
    users_collection,
    events_collection,
    bookings_collection,
    payments_collection,
    payouts_collection,
)


# -----------------------------------------
# 1) IMPROVED ADMIN STATS (REAL DATA)
# -----------------------------------------
def get_dashboard_stats():
    total_creators = users_collection.count_documents({"role": "CREATOR"})
    total_organizers = users_collection.count_documents({"role": "ORGANIZER"})
    total_users = users_collection.count_documents({})

    # Active + upcoming events
    now = datetime.utcnow()
    active_events = events_collection.count_documents({
        "start_date": {"$lte": now},
        "end_date": {"$gte": now}
    })

    upcoming_events = events_collection.count_documents({
        "start_date": {"$gt": now}
    })

    # Pending events (for review)
    pending_events = events_collection.count_documents({
        "status": "PENDING_REVIEW"
    })

    # Pending KYC → same users table (if you add)
    pending_kyc = users_collection.count_documents({
        "kyc_status": "PENDING"
    })

    # Pending disputes (support tickets)
    pending_disputes = 0  # future feature

    # Revenue (last 30 days)
    last30 = datetime.utcnow().timestamp() - (30 * 24 * 3600)
    recent_bookings = bookings_collection.find({
        "created_at": {"$gte": last30}
    })

    gmv30 = sum(b.get("amount", 0) for b in recent_bookings)
    bookings30 = bookings_collection.count_documents({
        "created_at": {"$gte": last30}
    })

    return {
        "totalCreators": total_creators,
        "totalOrganizers": total_organizers,
        "totalUsers": total_users,
        "activeEvents": active_events,
        "liveEvents": active_events,
        "upcomingEvents": upcoming_events,
        "pendingEvents": pending_events,
        "pendingKyc": pending_kyc,
        "pendingDisputes": pending_disputes,
        "gmv30d": gmv30,
        "bookings30d": bookings30,
    }


# -----------------------------------------
# 2) LATEST LISTINGS (REAL EVENTS)
# -----------------------------------------
def get_latest_listings(limit: int = 6):
    data = events_collection.find().sort("_id", -1).limit(limit)

    results = []
    for ev in data:
        results.append({
            "id": str(ev["_id"]),
            "title": ev.get("title", ""),
            "image": ev.get("cover_image", ""),
            "price": ev.get("stall_price", 0),
        })
    return results


# -----------------------------------------
# 3) REVENUE + MONTHLY GRAPH (REAL)
# -----------------------------------------
def get_payments_overview():
    payments = list(payments_collection.find())

    total_revenue = 0
    monthly_revenue = [0] * 12

    for p in payments:
        amount = p.get("amount", 0)
        total_revenue += amount

        created = p.get("created_at")
        if isinstance(created, datetime):
            idx = created.month - 1
            monthly_revenue[idx] += amount

    return {
        "total_revenue": total_revenue,
        "monthly_revenue": monthly_revenue,
    }


# -----------------------------------------
# 4) PAYOUT LOG (REAL DATA)
# -----------------------------------------
def get_payouts(limit: int = 10):
    data = payouts_collection.find().sort("_id", -1).limit(limit)

    return [
        {
            "id": str(p["_id"]),
            "user": p.get("user_name", ""),
            "amount": p.get("amount", 0),
            "status": p.get("status", "PENDING"),
        }
        for p in data
    ]


# -----------------------------------------
# 5) SUPER MERGED API (Supports AdminDashboard.tsx)
# -----------------------------------------
def get_full_dashboard():
    return {
        "stats": get_dashboard_stats(),
        "latest_listings": get_latest_listings(),
        "payments": get_payments_overview(),
        "payouts": get_payouts(),
    }

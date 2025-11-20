import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from jose import jwt
from bson import ObjectId
from datetime import datetime

from app.database import db
from app.auth.routes import oauth2_scheme
from app.config import settings
from app.organizer.schemas import OrganizerProfile, VenueCreate

organizer_router = APIRouter(tags=["Organizer"])

organizers = db["organizers"]
venues = db["venues"]
events = db["events"]
bookings = db["bookings"]
stalls = db["stalls"]

UPLOAD_DIR = "uploads/organizer"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# -----------------------------
# JWT → GET USER ID
# -----------------------------
def get_user_id(token: str = Depends(oauth2_scheme)):
    try:
        decoded = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGO])
        return decoded.get("id")
    except:
        raise HTTPException(401, "Invalid or expired token")


# -----------------------------
# GET PROFILE
# -----------------------------
@organizer_router.get("/me")
def get_me(userId: str = Depends(get_user_id)):

    data = organizers.find_one({"userId": userId})

    if not data:
        organizers.insert_one({
            "userId": userId,
            "brandName": "",
            "gst": "",
            "contactPerson": "",
            "phone": "",
            "about": "",
            "policies": "",
            "gstDoc": "",
            "idDoc": "",
        })
        data = organizers.find_one({"userId": userId})

    events_hosted = events.count_documents({"organizerId": userId})
    stalls_managed = bookings.count_documents({"organizerId": userId})

    return {
        "id": str(data["_id"]),
        "brandName": data.get("brandName", ""),
        "gst": data.get("gst", ""),
        "contactPerson": data.get("contactPerson", ""),
        "phone": data.get("phone", ""),
        "about": data.get("about", ""),
        "policies": data.get("policies", ""),
        "gstDoc": data.get("gstDoc", ""),
        "idDoc": data.get("idDoc", ""),

        "stats": {
            "eventsHosted": events_hosted,
            "stallsManaged": stalls_managed,
            "rating": 4.7,
            "profileComplete": 68
        }
    }


# -----------------------------
# UPDATE PROFILE
# -----------------------------
@organizer_router.patch("/me")
def update_profile(payload: OrganizerProfile, userId: str = Depends(get_user_id)):

    organizers.update_one(
        {"userId": userId},
        {"$set": payload.dict()}
    )

    return {"message": "Profile updated successfully"}


# -----------------------------
# VENUE LIST
# -----------------------------
@organizer_router.get("/venues")
def get_venues(userId: str = Depends(get_user_id)):

    data = list(venues.find({"organizerId": userId}))

    return [
        {
            "id": str(v["_id"]),
            "name": v["name"],
            "city": v["city"],
            "description": v["description"],
            "tier": v["tier"]
        }
        for v in data
    ]


# -----------------------------
# ADD VENUE
# -----------------------------
@organizer_router.post("/venues")
def add_venue(data: VenueCreate, userId: str = Depends(get_user_id)):

    venues.insert_one({
        "organizerId": userId,
        "name": data.name,
        "city": data.city,
        "description": data.description,
        "tier": data.tier
    })

    return {"message": "Venue added successfully"}


# -----------------------------
# DELETE VENUE
# -----------------------------
@organizer_router.delete("/venues/{venueId}")
def delete_venue(venueId: str, userId: str = Depends(get_user_id)):

    v = venues.find_one({"_id": ObjectId(venueId)})

    if not v:
        raise HTTPException(404, "Venue not found")

    if v["organizerId"] != userId:
        raise HTTPException(403, "Unauthorized action")

    venues.delete_one({"_id": ObjectId(venueId)})
    return {"message": "Venue removed successfully"}


# -----------------------------
# KYC DOCUMENTS UPLOAD
# -----------------------------
@organizer_router.post("/kyc/upload")
def upload_docs(
    gstDoc: UploadFile | None = File(None),
    idDoc: UploadFile | None = File(None),
    userId: str = Depends(get_user_id)
):

    update_data = {}

    if gstDoc:
        gst_path = f"{UPLOAD_DIR}/{userId}_gst_{gstDoc.filename}"
        with open(gst_path, "wb") as f:
            f.write(gstDoc.file.read())
        update_data["gstDoc"] = gst_path

    if idDoc:
        id_path = f"{UPLOAD_DIR}/{userId}_id_{idDoc.filename}"
        with open(id_path, "wb") as f:
            f.write(idDoc.file.read())
        update_data["idDoc"] = id_path

    if update_data:
        organizers.update_one({"userId": userId}, {"$set": update_data})

    return {"message": "KYC Documents Updated", "files": update_data}


# -----------------------------
# DASHBOARD
# -----------------------------
@organizer_router.get("/dashboard")
def organizer_dashboard(userId: str = Depends(get_user_id)):

    user_events = list(events.find({"organizerId": userId}))
    user_bookings = list(bookings.find({"organizerId": userId}))

    revenue = sum(b.get("amount", 0) for b in user_bookings)
    stalls_sold = len(user_bookings)
    total_stalls = stalls.count_documents({"organizerId": userId})
    active_events = events.count_documents({"organizerId": userId, "status": "active"})
    total_views = sum(e.get("views", 0) for e in user_events)

    now = datetime.now()

    # last 5 months revenue
    trend = []
    for i in range(4, -1, -1):
        month = (now.month - i - 1) % 12 + 1
        year = now.year if now.month - i > 0 else now.year - 1

        month_total = 0
        for b in user_bookings:
            if isinstance(b.get("date"), datetime):
                if b["date"].month == month and b["date"].year == year:
                    month_total += b.get("amount", 0)

        trend.append({
            "month": datetime(year, month, 1).strftime("%b"),
            "amount": month_total
        })

    # weekly bookings this month
    monthly_counts = [0, 0, 0, 0]

    for b in user_bookings:
        if isinstance(b.get("date"), datetime) and b["date"].month == now.month:
            week = (b["date"].day - 1) // 7
            if week < 4:
                monthly_counts[week] += 1

    return {
        "revenue": revenue,
        "stallsSold": stalls_sold,
        "totalStalls": total_stalls,
        "activeEvents": active_events,
        "totalViews": total_views,
        "revenueTrend": trend,
        "bookingsThisMonth": monthly_counts
    }


# -----------------------------
# MY EVENTS
# -----------------------------
@organizer_router.get("/me/events")
def get_my_events(userId: str = Depends(get_user_id)):

    my_events = list(events.find({"organizerId": userId}))

    return [
        {
            "id": str(e["_id"]),
            "title": e.get("title", ""),
            "views": e.get("views", 0),
            "status": e.get("status", "active"),
            "startAt": e.get("startAt"),
            "endAt": e.get("endAt"),
            "revenue": 0,
            "stallsSold": 0,
            "totalStalls": 0,
        }
        for e in my_events
    ]


# -----------------------------
# RECENT BOOKINGS
# -----------------------------
@organizer_router.get("/me/bookings")
def get_my_bookings(userId: str = Depends(get_user_id)):

    data = list(bookings.find({"organizerId": userId}))

    return [
        {
            "id": str(b["_id"]),
            "eventId": b.get("eventId", ""),
            "stallId": b.get("stallId", ""),
            "amount": b.get("amount", 0),
            "date": b.get("date"),
        }
        for b in data
    ]


# -----------------------------
# STATS TOP CARDS
# -----------------------------
@organizer_router.get("/me/stats")
def organizer_stats(userId: str = Depends(get_user_id)):

    total_events = events.count_documents({"organizerId": userId})
    total_bookings = bookings.count_documents({"organizerId": userId})
    revenue = sum(b.get("amount", 0) for b in bookings.find({"organizerId": userId}))
    total_views = sum(e.get("views", 0) for e in events.find({"organizerId": userId}))

    return {
        "totalEvents": total_events,
        "totalBookings": total_bookings,
        "revenue": revenue,
        "views": total_views
    }

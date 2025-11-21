from fastapi import APIRouter, Depends, HTTPException
from app.database import db
from app.auth.routes import oauth2_scheme
from jose import jwt
from app.config import settings
from bson import ObjectId
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from .schemas import ReviewRequest, InvoiceResponse

booking_router = APIRouter(tags=["Bookings"])

# Collections
bookings_collection = db["bookings"]
events_collection = db["events"]
stalls_collection = db["stalls"]


# ----------------------------------------
# JWT → userId
# ----------------------------------------
def get_user_id(token: str = Depends(oauth2_scheme)):
    try:
        decoded = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGO]
        )
        return decoded.get("id")
    except Exception:
        raise HTTPException(401, "Invalid or expired token")


# ========================================
# REQUEST MODEL
# ========================================
class CreateBookingRequest(BaseModel):
    eventId: str
    stallId: str
    amount: Optional[float] = None
    paymentMethod: Optional[str] = "online"


# ========================================
# CREATE BOOKING (FIXED)
# POST: /bookings/create
# ========================================
@booking_router.post("/create")
def create_booking(
    data: CreateBookingRequest,
    userId: str = Depends(get_user_id),
):

    # -----------------------------
    # Validate EVENT
    # -----------------------------
    try:
        event_obj_id = ObjectId(data.eventId)
    except:
        raise HTTPException(400, "Invalid eventId")

    event = events_collection.find_one({"_id": event_obj_id})
    if not event:
        raise HTTPException(404, "Event not found")

    # -----------------------------
    # Validate STALL
    # -----------------------------
    try:
        stall_obj_id = ObjectId(data.stallId)
    except:
        raise HTTPException(400, "Invalid stallId")

    stall = stalls_collection.find_one({"_id": stall_obj_id})
    if not stall:
        raise HTTPException(404, "Stall not found")

    # Stall must belong to event
    stall_event_id = str(stall.get("eventId"))
    if stall_event_id != data.eventId:
        raise HTTPException(400, "Stall does not belong to this event")

    # Stall availability
    if stall.get("qtyLeft", 0) <= 0:
        raise HTTPException(400, "Stall is sold out")

    # Prevent duplicate booking of same stall
    existing = bookings_collection.find_one({
        "creatorId": userId,
        "stall": str(stall_obj_id)
    })
    if existing:
        raise HTTPException(400, "You have already booked this stall")

    # -----------------------------
    # Determine AMOUNT
    # -----------------------------
    amount = float(data.amount or stall.get("price") or 0)

    # -----------------------------
    # CREATE BOOKING
    # -----------------------------
    booking_doc = {
        "creatorId": userId,
        "event": str(event_obj_id),
        "stall": str(stall_obj_id),
        "amount": amount,
        "status": "PAID",
        "paymentMethod": data.paymentMethod or "online",
        "createdAt": datetime.utcnow().isoformat(),
        "reviewed": False,
    }

    res = bookings_collection.insert_one(booking_doc)
    booking_id = str(res.inserted_id)

    # -----------------------------
    # 🔥 FIX: Reduce Stall qtyLeft
    # -----------------------------
    stalls_collection.update_one(
        {"_id": stall_obj_id},
        {"$inc": {"qtyLeft": -1}}
    )

    # -----------------------------
    # RESPONSE
    # -----------------------------
    return {
        "id": booking_id,
        "status": booking_doc["status"],
        "amount": booking_doc["amount"],
        "event": {
            "title": event.get("title", ""),
            "cityId": event.get("cityId", ""),
            "startAt": event.get("startAt"),
            "endAt": event.get("endAt"),
        },
        "stall": {
            "name": stall.get("name", ""),
            "tier": stall.get("tier", ""),
            "price": stall.get("price", 0),
        },
        "createdAt": booking_doc["createdAt"],
        "message": "Booking created",
    }


# -------------------------------------------------
# GET: /bookings/my
# -------------------------------------------------
@booking_router.get("/my")
def get_my_bookings(userId: str = Depends(get_user_id)):

    bookings = list(bookings_collection.find({"creatorId": userId}))
    result = []

    for b in bookings:

        # EVENT
        event = None
        try:
            event = events_collection.find_one({"_id": ObjectId(b.get("event"))})
        except:
            pass

        # STALL
        stall = None
        try:
            stall = stalls_collection.find_one({"_id": ObjectId(b.get("stall"))})
        except:
            pass

        result.append({
            "id": str(b["_id"]),
            "status": b.get("status", "PAID"),
            "amount": b.get("amount", stall.get("price") if stall else 0),
            "createdAt": b.get("createdAt"),
            "event": {
                "title": event.get("title") if event else "",
                "cityId": event.get("cityId") if event else "",
                "startAt": event.get("startAt") if event else None,
                "endAt": event.get("endAt") if event else None,
            },
            "stall": {
                "name": stall.get("name") if stall else "",
                "tier": stall.get("tier") if stall else "",
                "price": stall.get("price") if stall else 0,
            }
        })

    return result


# -------------------------------------------------
# UPCOMING BOOKINGS
# -------------------------------------------------
@booking_router.get("/upcoming")
def get_upcoming_bookings(userId: str = Depends(get_user_id)):

    today = datetime.utcnow()
    bookings = list(bookings_collection.find({"creatorId": userId}))
    result = []

    for b in bookings:

        # EVENT
        event = None
        try:
            event = events_collection.find_one({"_id": ObjectId(b.get("event"))})
        except:
            continue

        if not event or not event.get("startAt"):
            continue

        event_start = datetime.fromisoformat(event["startAt"])
        if event_start <= today:
            continue

        # STALL
        stall = None
        try:
            stall = stalls_collection.find_one({"_id": ObjectId(b.get("stall"))})
        except:
            pass

        result.append({
            "id": str(b["_id"]),
            "status": b.get("status", "PAID"),
            "amount": b.get("amount", stall.get("price") if stall else 0),
            "event": {
                "title": event.get("title"),
                "cityId": event.get("cityId"),
                "startAt": event.get("startAt"),
                "endAt": event.get("endAt"),
            },
            "stall": {
                "name": stall.get("name") if stall else "",
                "tier": stall.get("tier") if stall else "",
                "price": stall.get("price") if stall else 0,
            }
        })

    return result


# -------------------------------------------------
# PAST BOOKINGS
# -------------------------------------------------
@booking_router.get("/past")
def get_past_bookings(userId: str = Depends(get_user_id)):

    today = datetime.utcnow()
    bookings = list(bookings_collection.find({"creatorId": userId}))
    result = []

    for b in bookings:

        # EVENT
        event = None
        try:
            event = events_collection.find_one({"_id": ObjectId(b.get("event"))})
        except:
            continue

        if not event or not event.get("startAt"):
            continue

        event_start = datetime.fromisoformat(event["startAt"])
        if event_start >= today:
            continue

        # STALL
        stall = None
        try:
            stall = stalls_collection.find_one({"_id": ObjectId(b.get("stall"))})
        except:
            pass

        result.append({
            "id": str(b["_id"]),
            "status": b.get("status", "PAID"),
            "amount": b.get("amount", stall.get("price") if stall else 0),
            "event": {
                "title": event.get("title"),
                "cityId": event.get("cityId"),
                "startAt": event.get("startAt"),
                "endAt": event.get("endAt"),
            },
            "stall": {
                "name": stall.get("name") if stall else "",
                "tier": stall.get("tier") if stall else "",
                "price": stall.get("price") if stall else 0,
            }
        })

    return result


# -------------------------------------------------
# REVIEW
# -------------------------------------------------
@booking_router.post("/{bookingId}/review")
def review_booking(
    bookingId: str,
    data: ReviewRequest,
    userId: str = Depends(get_user_id)
):

    booking = bookings_collection.find_one({"_id": ObjectId(bookingId)})
    if not booking:
        raise HTTPException(404, "Booking not found")

    if booking["creatorId"] != userId:
        raise HTTPException(403, "Unauthorized")

    update_data = {
        "reviewed": True,
        "rating": data.rating,
    }

    if data.reviewText:
        update_data["reviewText"] = data.reviewText

    bookings_collection.update_one(
        {"_id": ObjectId(bookingId)},
        {"$set": update_data}
    )

    return {"message": "Review submitted"}


# -------------------------------------------------
# INVOICE
# -------------------------------------------------
@booking_router.get("/invoice/{bookingId}", response_model=InvoiceResponse)
def generate_invoice(bookingId: str, userId: str = Depends(get_user_id)):

    booking = bookings_collection.find_one({"_id": ObjectId(bookingId)})
    if not booking:
        raise HTTPException(404, "Booking not found")

    if booking["creatorId"] != userId:
        raise HTTPException(403, "Unauthorized")

    event = events_collection.find_one({"_id": ObjectId(booking["event"])})
    stall = stalls_collection.find_one({"_id": ObjectId(booking["stall"])})

    invoiceUrl = f"https://sharthi.in/invoices/{bookingId}.pdf"

    return {
        "bookingId": bookingId,
        "invoiceUrl": invoiceUrl,
        "amount": booking.get("amount", stall.get("price")),
        "eventTitle": event.get("title"),
        "stallName": stall.get("name"),
        "date": booking.get("createdAt", str(datetime.utcnow()))
    }

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
# NEW: CREATE BOOKING
# POST: /bookings/create
# ========================================

class CreateBookingRequest(BaseModel):
    eventId: str
    stallId: str
    amount: Optional[float] = None      # optional, fallback = stall.price
    paymentMethod: Optional[str] = "online"  # future use


@booking_router.post("/create")
def create_booking(
    data: CreateBookingRequest,
    userId: str = Depends(get_user_id),
):
    """
    Create a new booking for given event + stall.
    Body:
    {
      "eventId": "...",
      "stallId": "...",
      "amount": 8000   # optional
    }
    """

    # --- Validate event ---
    try:
        event_obj_id = ObjectId(data.eventId)
    except Exception:
        raise HTTPException(400, "Invalid eventId")

    event = events_collection.find_one({"_id": event_obj_id})
    if not event:
        raise HTTPException(404, "Event not found")

    # --- Validate stall ---
    try:
        stall_obj_id = ObjectId(data.stallId)
    except Exception:
        raise HTTPException(400, "Invalid stallId")

    stall = stalls_collection.find_one({"_id": stall_obj_id})
    if not stall:
        raise HTTPException(404, "Stall not found")

    # Optional: ensure stall belongs to same event
    event_id_in_stall = stall.get("eventId") or stall.get("event") or None
    if event_id_in_stall and str(event_id_in_stall) not in {
        data.eventId,
        str(event_obj_id),
    }:
        raise HTTPException(400, "Stall does not belong to this event")

    # --- Amount / price ---
    amount = data.amount
    if amount is None:
        amount = float(stall.get("price", 0) or 0)

    # --- Build booking doc ---
    booking_doc = {
        "creatorId": userId,
        "event": str(event_obj_id),   # we keep ids as strings for simplicity
        "stall": str(stall_obj_id),
        "amount": amount,
        "status": "PAID",             # or "PENDING" if you later add payment gateway
        "paymentMethod": data.paymentMethod or "online",
        "createdAt": datetime.utcnow().isoformat(),
        "reviewed": False,
    }

    res = bookings_collection.insert_one(booking_doc)
    booking_id = str(res.inserted_id)

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
# Full detailed booking list (used by frontend)
# -------------------------------------------------
@booking_router.get("/my")
def get_my_bookings(userId: str = Depends(get_user_id)):

    bookings = list(bookings_collection.find({"creatorId": userId}))
    result = []

    for b in bookings:

        # EVENT
        event = b.get("event")
        if isinstance(event, str):
            try:
                event = events_collection.find_one({"_id": ObjectId(event)})
            except Exception:
                event = None

        # STALL
        stall = b.get("stall")
        if isinstance(stall, str):
            try:
                stall = stalls_collection.find_one({"_id": ObjectId(stall)})
            except Exception:
                stall = None

        created = b.get("createdAt")

        result.append({
            "id": str(b["_id"]),
            "status": b.get("status", "PAID"),
            "amount": b.get("amount", stall.get("price") if stall else 0),
            "createdAt": created,
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
# GET: /bookings/upcoming
# -------------------------------------------------
@booking_router.get("/upcoming")
def get_upcoming_bookings(userId: str = Depends(get_user_id)):

    today = datetime.utcnow()

    bookings = list(bookings_collection.find({"creatorId": userId}))
    result = []

    for b in bookings:

        event = b.get("event")
        if isinstance(event, str):
            try:
                event = events_collection.find_one({"_id": ObjectId(event)})
            except Exception:
                event = None

        if not event or not event.get("startAt"):
            continue

        eventStart = datetime.fromisoformat(event["startAt"])

        if eventStart > today:
            # stall
            stall = b.get("stall")
            if isinstance(stall, str):
                try:
                    stall = stalls_collection.find_one({"_id": ObjectId(stall)})
                except Exception:
                    stall = None

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
# GET: /bookings/past
# -------------------------------------------------
@booking_router.get("/past")
def get_past_bookings(userId: str = Depends(get_user_id)):

    today = datetime.utcnow()

    bookings = list(bookings_collection.find({"creatorId": userId}))
    result = []

    for b in bookings:

        event = b.get("event")
        if isinstance(event, str):
            try:
                event = events_collection.find_one({"_id": ObjectId(event)})
            except Exception:
                event = None

        if not event or not event.get("startAt"):
            continue

        eventStart = datetime.fromisoformat(event["startAt"])

        # past event
        if eventStart < today:

            stall = b.get("stall")
            if isinstance(stall, str):
                try:
                    stall = stalls_collection.find_one({"_id": ObjectId(stall)})
                except Exception:
                    stall = None

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
# POST REVIEW → /bookings/{id}/review
# -------------------------------------------------
@booking_router.post("/{bookingId}/review")
def review_booking(
    bookingId: str,
    data: ReviewRequest,
    userId: str = Depends(get_user_id),
):

    booking = bookings_collection.find_one({"_id": ObjectId(bookingId)})
    if not booking:
        raise HTTPException(404, "Booking not found")

    if booking["creatorId"] != userId:
        raise HTTPException(403, "Unauthorized")

    updateData = {
        "reviewed": True,
        "rating": data.rating,
    }

    if data.reviewText:
        updateData["reviewText"] = data.reviewText

    bookings_collection.update_one(
        {"_id": ObjectId(bookingId)},
        {"$set": updateData}
    )

    return {"message": "Review submitted"}


# -------------------------------------------------
# INVOICE → /bookings/invoice/{bookingId}
# -------------------------------------------------
@booking_router.get("/invoice/{bookingId}", response_model=InvoiceResponse)
def generate_invoice(bookingId: str, userId: str = Depends(get_user_id)):

    booking = bookings_collection.find_one({"_id": ObjectId(bookingId)})

    if not booking:
        raise HTTPException(404, "Booking not found")

    if booking["creatorId"] != userId:
        raise HTTPException(403, "Unauthorized")

    eventId = booking["event"]
    stallId = booking["stall"]

    event = events_collection.find_one({"_id": ObjectId(eventId)})
    stall = stalls_collection.find_one({"_id": ObjectId(stallId)})

    # invoice dummy URL
    invoiceUrl = f"https://sharthi.in/invoices/{bookingId}.pdf"

    return {
        "bookingId": bookingId,
        "invoiceUrl": invoiceUrl,
        "amount": booking.get("amount", stall.get("price")),
        "eventTitle": event.get("title"),
        "stallName": stall.get("name"),
        "date": booking.get("createdAt", str(datetime.utcnow()))
    }

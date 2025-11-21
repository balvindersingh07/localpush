from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime
from jose import jwt

from app.database import db
from app.auth.routes import oauth2_scheme
from app.config import settings

stall_router = APIRouter(tags=["Stalls"])

stalls = db["stalls"]
events = db["events"]


# -------------------------
# AUTH (Organizer Only)
# -------------------------
def get_user_id(token: str = Depends(oauth2_scheme)):
    try:
        decoded = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGO])
        return decoded.get("id")
    except:
        raise HTTPException(401, "Invalid or expired token")


# -------------------------
# SERIALIZER
# -------------------------
def serialize_stall(s):
    return {
        "id": str(s["_id"]),
        "eventId": str(s.get("eventId")),
        "organizerId": s.get("organizerId"),

        # FIXED — Make tier clean
        "name": s.get("name"),
        "tier": str(s.get("tier", "")).replace(",", "").strip().upper(),

        "price": int(s.get("price", 0)),
        "qtyTotal": int(s.get("qtyTotal", 0)),
        "qtyLeft": int(s.get("qtyLeft", 0)),

        "specs": s.get("specs", ""),
        "createdAt": s["createdAt"].isoformat() if s.get("createdAt") else None,
    }


# ===========================================================
# =============== ORGANIZER VIEW (AUTH REQUIRED) ============
# ===========================================================
@stall_router.get("/stalls/event/{eventId}")
def get_stalls_for_organizer(eventId: str, userId: str = Depends(get_user_id)):

    if not ObjectId.is_valid(eventId):
        raise HTTPException(400, "Invalid event Id")

    ev = events.find_one({"_id": ObjectId(eventId)})
    if not ev:
        raise HTTPException(404, "Event not found")

    if ev["organizerId"] != userId:
        raise HTTPException(403, "Not authorized")

    found = list(stalls.find({"eventId": ObjectId(eventId)}).sort("createdAt", -1))

    return {"stalls": [serialize_stall(s) for s in found]}


# ===========================================================
# ============= PUBLIC CREATOR VIEW (NO LOGIN) ==============
# ===========================================================
@stall_router.get("/events/{eventId}/stalls")
def get_stalls_public(eventId: str):

    if not ObjectId.is_valid(eventId):
        raise HTTPException(400, "Invalid event Id")

    found = list(stalls.find({"eventId": ObjectId(eventId)}))

    return {"stalls": [serialize_stall(s) for s in found]}


# ===========================================================
# ================ CREATE STALL (Organizer Only) ============
# ===========================================================
@stall_router.post("/events/{eventId}/stalls")
def create_stall(eventId: str, data: dict, userId: str = Depends(get_user_id)):

    if not ObjectId.is_valid(eventId):
        raise HTTPException(400, "Invalid event id")

    ev = events.find_one({"_id": ObjectId(eventId)})
    if not ev:
        raise HTTPException(404, "Event not found")

    if ev["organizerId"] != userId:
        raise HTTPException(403, "Unauthorized")

    # Clean tier
    tier_clean = str(data.get("tier", "SILVER")).replace(",", "").strip().upper()

    s_data = {
        "eventId": ObjectId(eventId),
        "organizerId": userId,
        "name": data.get("name"),
        "tier": tier_clean,
        "price": int(data.get("price", 0)),
        "qtyTotal": int(data.get("qtyTotal", 0)),
        "qtyLeft": int(data.get("qtyTotal", 0)),
        "specs": data.get("specs", ""),
        "createdAt": datetime.utcnow(),
    }

    res = stalls.insert_one(s_data)
    saved = stalls.find_one({"_id": res.inserted_id})

    return {"message": "Stall created", "stall": serialize_stall(saved)}

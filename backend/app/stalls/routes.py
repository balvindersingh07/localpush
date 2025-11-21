from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime

from app.database import db
from app.auth.routes import oauth2_scheme
from app.config import settings
from jose import jwt

stall_router = APIRouter(tags=["Stalls"])

stalls = db["stalls"]
events = db["events"]

# -------------------------
# JWT → userId
# -------------------------
def get_user_id(token: str = Depends(oauth2_scheme)):
    try:
        decoded = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGO]
        )
        return decoded.get("id")
    except:
        raise HTTPException(401, "Invalid or expired token")


# -------------------------
# SERIALIZER
# -------------------------
def serialize_stall(s):
    return {
        "id": str(s["_id"]),
        "eventId": s.get("eventId", ""),
        "organizerId": s.get("organizerId", ""),
        "name": s.get("name", ""),
        "tier": s.get("tier", "SILVER"),
        "price": int(s.get("price", 0)),
        "qtyTotal": int(s.get("qtyTotal", 0)),
        "qtyLeft": int(s.get("qtyLeft", 0)),
        "specs": s.get("specs", ""),
        "createdAt": s.get("createdAt").isoformat() if s.get("createdAt") else None,
    }


# =================================================
# ✅ PUBLIC STALLS — FINAL FIX
# GET /events/{eventId}/stalls
# =================================================
# ❗ THIS ENDPOINT NOW REMOVED FROM HERE
# Public stalls already provided by events/routes.py
# =================================================


# =================================================
# 👉 NEW FIXED ENDPOINT FOR ORGANIZER PANEL
# GET /stalls/event/{eventId}
# =================================================
@stall_router.get("/stalls/event/{eventId}")
def get_stalls_for_organizer(eventId: str, userId: str = Depends(get_user_id)):

    if not ObjectId.is_valid(eventId):
        raise HTTPException(400, "Invalid event Id")

    ev = events.find_one({"_id": ObjectId(eventId)})
    if not ev:
        raise HTTPException(404, "Event not found")

    if ev["organizerId"] != userId:
        raise HTTPException(403, "Not authorized")

    found = list(stalls.find({"eventId": eventId}).sort("createdAt", -1))
    return {"stalls": [serialize_stall(s) for s in found]}


# =================================================
# CREATE STALL
# =================================================
@stall_router.post("/events/{eventId}/stalls")
def create_stall(eventId: str, data: dict, userId: str = Depends(get_user_id)):

    if not ObjectId.is_valid(eventId):
        raise HTTPException(400, "Invalid eventId")

    ev = events.find_one({"_id": ObjectId(eventId)})
    if not ev:
        raise HTTPException(404, "Event not found")

    if ev["organizerId"] != userId:
        raise HTTPException(403, "Unauthorized")

    new_stall = {
        "eventId": eventId,
        "organizerId": userId,
        "name": data.get("name", ""),
        "tier": data.get("tier", "SILVER"),
        "price": int(data.get("price", 0)),
        "qtyTotal": int(data.get("qtyTotal", 0)),
        "qtyLeft": int(data.get("qtyTotal", 0)),
        "specs": data.get("specs", ""),
        "createdAt": datetime.utcnow(),
    }

    res = stalls.insert_one(new_stall)
    saved = stalls.find_one({"_id": res.inserted_id})

    return {"message": "Stall created", "stall": serialize_stall(saved)}


# =================================================
# EDIT STALL
# =================================================
@stall_router.patch("/stalls/{stallId}")
def edit_stall(stallId: str, data: dict, userId: str = Depends(get_user_id)):

    if not ObjectId.is_valid(stallId):
        raise HTTPException(400, "Invalid stallId")

    s = stalls.find_one({"_id": ObjectId(stallId)})
    if not s:
        raise HTTPException(404, "Stall not found")

    if s["organizerId"] != userId:
        raise HTTPException(403, "Unauthorized")

    update_data = {}

    if "name" in data:
        update_data["name"] = data["name"]
    if "tier" in data:
        update_data["tier"] = data["tier"]
    if "price" in data:
        update_data["price"] = int(data["price"])

    if "qtyTotal" in data:
        new_total = int(data["qtyTotal"])
        sold = s["qtyTotal"] - s["qtyLeft"]
        if new_total < sold:
            raise HTTPException(400, "Cannot reduce below already sold")

        update_data["qtyTotal"] = new_total
        update_data["qtyLeft"] = new_total - sold

    if "specs" in data:
        update_data["specs"] = data["specs"]

    stalls.update_one({"_id": ObjectId(stallId)}, {"$set": update_data})

    updated = stalls.find_one({"_id": ObjectId(stallId)})
    return {"message": "Stall updated", "stall": serialize_stall(updated)}


# =================================================
# DELETE STALL
# =================================================
@stall_router.delete("/stalls/{stallId}")
def delete_stall(stallId: str, userId: str = Depends(get_user_id)):

    if not ObjectId.is_valid(stallId):
        raise HTTPException(400, "Invalid stallId")

    s = stalls.find_one({"_id": ObjectId(stallId)})
    if not s:
        raise HTTPException(404, "Stall not found")

    if s["organizerId"] != userId:
        raise HTTPException(403, "Unauthorized")

    sold = s["qtyTotal"] - s["qtyLeft"]
    if sold > 0:
        raise HTTPException(400, "Cannot delete stall with bookings")

    stalls.delete_one({"_id": ObjectId(stallId)})
    return {"message": "Stall deleted"}

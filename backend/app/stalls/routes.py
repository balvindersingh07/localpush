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


# ------------------------------------------------
# JWT → Get userId from token
# ------------------------------------------------
def get_user_id(token: str = Depends(oauth2_scheme)):
    try:
        decoded = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGO])
        return decoded.get("id")
    except:
        raise HTTPException(401, "Invalid or expired token")


# ------------------------------------------------
# Stall Serializer
# ------------------------------------------------
def serialize_stall(s):
    return {
        "id": str(s["_id"]),
        "eventId": s.get("eventId", ""),
        "organizerId": s.get("organizerId", ""),

        "name": s.get("name") or s.get("stallName") or "",
        "tier": s.get("tier", "SILVER"),

        "price": s.get("price", 0),
        "qtyTotal": s.get("qtyTotal", 0),
        "qtyLeft": s.get("qtyLeft", 0),

        "specs": s.get("specs", ""),
        "createdAt": s.get("createdAt").isoformat() if s.get("createdAt") else None,
    }


# ------------------------------------------------
# GET ALL STALLS FOR EVENT
# ------------------------------------------------
@stall_router.get("/events/{eventId}/stalls")
def get_stalls(eventId: str, userId: str = Depends(get_user_id)):

    if not ObjectId.is_valid(eventId):
        raise HTTPException(400, "Invalid eventId")

    # Ensure event exists
    ev = events.find_one({"_id": ObjectId(eventId)})
    if not ev:
        raise HTTPException(404, "Event not found")

    # Organizer can only view their own event stalls
    if ev.get("organizerId") != userId:
        raise HTTPException(403, "You are not authorized for this event")

    found = list(stalls.find({"eventId": eventId}).sort("createdAt", -1))
    return {"stalls": [serialize_stall(s) for s in found]}


# ------------------------------------------------
# CREATE NEW STALL
# ------------------------------------------------
@stall_router.post("/events/{eventId}/stalls")
def create_stall(eventId: str, data: dict, userId: str = Depends(get_user_id)):

    if not ObjectId.is_valid(eventId):
        raise HTTPException(400, "Invalid eventId")

    # Ensure event exists
    ev = events.find_one({"_id": ObjectId(eventId)})
    if not ev:
        raise HTTPException(404, "Event not found")

    # Organizer only
    if ev.get("organizerId") != userId:
        raise HTTPException(403, "You are not authorized to add stalls")

    new_stall = {
        "eventId": eventId,
        "organizerId": userId,

        "name": data.get("name", ""),
        "tier": data.get("tier", "SILVER"),
        "price": int(data.get("price", 0)),

        "qtyTotal": int(data.get("qtyTotal", 0)),
        "qtyLeft": int(data.get("qtyTotal", 0)),

        "specs": data.get("specs", ""),

        "createdAt": datetime.now(),
    }

    result = stalls.insert_one(new_stall)
    saved = stalls.find_one({"_id": result.inserted_id})

    return {
        "message": "Stall created successfully",
        "stall": serialize_stall(saved),
    }


# ------------------------------------------------
# EDIT STALL
# ------------------------------------------------
@stall_router.patch("/stalls/{stallId}")
def edit_stall(stallId: str, data: dict, userId: str = Depends(get_user_id)):

    if not ObjectId.is_valid(stallId):
        raise HTTPException(400, "Invalid stallId")

    s = stalls.find_one({"_id": ObjectId(stallId)})
    if not s:
        raise HTTPException(404, "Stall not found")

    # Organizer only
    if s.get("organizerId") != userId:
        raise HTTPException(403, "Not authorized")

    update_data = {}

    if "name" in data:
        update_data["name"] = data["name"]
    if "tier" in data:
        update_data["tier"] = data["tier"]
    if "price" in data:
        update_data["price"] = int(data["price"])
    if "qtyTotal" in data:
        qty_new = int(data["qtyTotal"])
        sold = s["qtyTotal"] - s["qtyLeft"]
        if qty_new < sold:
            raise HTTPException(400, "Cannot reduce below already sold quantity")
        update_data["qtyTotal"] = qty_new
        update_data["qtyLeft"] = qty_new - sold
    if "specs" in data:
        update_data["specs"] = data["specs"]

    stalls.update_one({"_id": ObjectId(stallId)}, {"$set": update_data})
    updated = stalls.find_one({"_id": ObjectId(stallId)})

    return {
        "message": "Stall updated successfully",
        "stall": serialize_stall(updated)
    }


# ------------------------------------------------
# DELETE STALL
# ------------------------------------------------
@stall_router.delete("/stalls/{stallId}")
def delete_stall(stallId: str, userId: str = Depends(get_user_id)):

    if not ObjectId.is_valid(stallId):
        raise HTTPException(400, "Invalid stallId")

    s = stalls.find_one({"_id": ObjectId(stallId)})
    if not s:
        raise HTTPException(404, "Stall not found")

    # Organizer only
    if s.get("organizerId") != userId:
        raise HTTPException(403, "Not authorized")

    # If stall already sold, prevent deletion
    sold = s["qtyTotal"] - s["qtyLeft"]
    if sold > 0:
        raise HTTPException(400, "Cannot delete stall that has bookings")

    stalls.delete_one({"_id": ObjectId(stallId)})

    return {"message": "Stall deleted successfully"}

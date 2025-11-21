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

def get_user_id(token: str = Depends(oauth2_scheme)):
    try:
        d = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGO])
        return d["id"]
    except:
        raise HTTPException(401, "Invalid or expired token")


def serialize_stall(s):
    return {
        "id": str(s["_id"]),
        "eventId": s["eventId"],
        "organizerId": s["organizerId"],
        "name": s.get("name", ""),
        "tier": s.get("tier", "SILVER"),
        "price": s.get("price", 0),
        "qtyTotal": s.get("qtyTotal", 0),
        "qtyLeft": s.get("qtyLeft", 0),
        "specs": s.get("specs", ""),
        "createdAt": s["createdAt"].isoformat(),
    }


# PUBLIC GET
@stall_router.get("/events/{eventId}/stalls")
def public_stalls(eventId: str):
    found = list(stalls.find({"eventId": eventId}))
    return {"stalls": [serialize_stall(s) for s in found]}


# CREATE STALL
@stall_router.post("/events/{eventId}/stalls")
def create_stall(eventId: str, body: dict, userId: str = Depends(get_user_id)):

    ev = events.find_one({"_id": ObjectId(eventId)})
    if not ev:
        raise HTTPException(404, "Event not found")

    if ev["organizerId"] != userId:
        raise HTTPException(403, "Unauthorized")

    doc = {
        "eventId": eventId,
        "organizerId": userId,
        "name": body.get("name", ""),
        "tier": body.get("tier", "SILVER"),
        "price": int(body.get("price", 0)),
        "qtyTotal": int(body.get("qtyTotal", 0)),
        "qtyLeft": int(body.get("qtyTotal", 0)),
        "specs": body.get("specs", ""),
        "createdAt": datetime.now(),
    }

    _id = stalls.insert_one(doc).inserted_id
    return {"stall": serialize_stall(stalls.find_one({"_id": _id}))}


# EDIT
@stall_router.patch("/stalls/{stallId}")
def edit_stall(stallId: str, body: dict, userId: str = Depends(get_user_id)):

    s = stalls.find_one({"_id": ObjectId(stallId)})
    if not s:
        raise HTTPException(404, "Stall not found")

    if s["organizerId"] != userId:
        raise HTTPException(403, "Unauthorized")

    update = {}

    if "name" in body:
        update["name"] = body["name"]

    if "tier" in body:
        update["tier"] = body["tier"]

    if "price" in body:
        update["price"] = int(body["price"])

    if "qtyTotal" in body:
        new_total = int(body["qtyTotal"])
        sold = s["qtyTotal"] - s["qtyLeft"]
        if new_total < sold:
            raise HTTPException(400, "Cannot reduce below sold")
        update["qtyTotal"] = new_total
        update["qtyLeft"] = new_total - sold

    if "specs" in body:
        update["specs"] = body["specs"]

    stalls.update_one({"_id": s["_id"]}, {"$set": update})

    return {"stall": serialize_stall(stalls.find_one({"_id": s["_id"]}))}


# DELETE
@stall_router.delete("/stalls/{stallId}")
def delete_stall(stallId: str, userId: str = Depends(get_user_id)):

    s = stalls.find_one({"_id": ObjectId(stallId)})
    if not s:
        raise HTTPException(404, "Not found")

    if s["organizerId"] != userId:
        raise HTTPException(403, "Unauthorized")

    sold = s["qtyTotal"] - s["qtyLeft"]
    if sold > 0:
        raise HTTPException(400, "Cannot delete — has bookings")

    stalls.delete_one({"_id": s["_id"]})
    return {"message": "Deleted"}

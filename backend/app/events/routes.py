from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime

from app.database import db
from app.auth.routes import oauth2_scheme
from app.config import settings
from jose import jwt

event_router = APIRouter(tags=["Events"])

events = db["events"]
stalls_col = db["stalls"]

def get_user_id(token: str = Depends(oauth2_scheme)):
    try:
        decoded = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGO])
        return decoded.get("id")
    except:
        raise HTTPException(401, "Invalid or expired token")


def serialize_event(e):
    return {
        "id": str(e["_id"]),
        "organizerId": e.get("organizerId"),
        "title": e.get("title"),
        "cityId": e.get("cityId"),
        "startAt": e["startAt"].isoformat() if e.get("startAt") else None,
        "endAt": e["endAt"].isoformat() if e.get("endAt") else None,
        "tags": e.get("tags", []),
        "venueName": e.get("venueName", ""),
        "location": e.get("location", ""),
        "description": e.get("description", ""),
        "coverImage": e.get("coverImage", ""),
        "bannerImage": e.get("bannerImage", ""),
        "views": e.get("views", 0),
        "status": e.get("status", "active"),
        "createdAt": e["createdAt"].isoformat() if e.get("createdAt") else None,
    }


@event_router.get("/")
def get_events(city: str | None = None, tags: str | None = None):
    query = {}

    if city:
        query["cityId"] = {"$regex": city, "$options": "i"}

    if tags:
        tag_list = [t.strip().lower() for t in tags.split(",")]
        query["tags"] = {"$in": tag_list}

    fetched = list(events.find(query).sort("createdAt", -1))
    return [serialize_event(e) for e in fetched]


@event_router.get("/{eventId}")
def get_event(eventId: str):
    if not ObjectId.is_valid(eventId):
        raise HTTPException(400, "Invalid eventId")

    e = events.find_one({"_id": ObjectId(eventId)})
    if not e:
        raise HTTPException(404, "Event not found")

    return serialize_event(e)


# --------------------------------------------------------
# ⭐ FINAL FIX - MUST RETURN ARRAY, NOT { stalls: [...] }
# --------------------------------------------------------
@event_router.get("/{eventId}/stalls")
def get_event_stalls(eventId: str):
    if not ObjectId.is_valid(eventId):
        raise HTTPException(400, "Invalid eventId")

    found = list(stalls_col.find({"eventId": eventId}).sort("price", 1))

    stalls_arr = [
        {
            "id": str(s["_id"]),
            "name": s.get("name", ""),
            "tier": s.get("tier", ""),
            "price": int(s.get("price", 0)),
            "qtyTotal": int(s.get("qtyTotal", 0)),
            "qtyLeft": int(s.get("qtyLeft", 0)),
            "specs": s.get("specs", ""),
        }
        for s in found
    ]

    return stalls_arr  # FIX ✔✔✔

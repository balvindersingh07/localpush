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
# SERIALIZER → Convert Mongo Event doc
# ------------------------------------------------
def serialize_event(e):
    if not e:
        return None

    return {
        "id": str(e["_id"]),
        "organizerId": e.get("organizerId", ""),
        "title": e.get("title", ""),
        "cityId": e.get("cityId", ""),

        "startAt": e.get("startAt").isoformat() if e.get("startAt") else None,
        "endAt": e.get("endAt").isoformat() if e.get("endAt") else None,

        "tags": e.get("tags", []),
        "location": e.get("location", ""),
        "venueName": e.get("venueName", ""),
        "description": e.get("description", ""),

        "coverImage": e.get("coverImage", ""),
        "bannerImage": e.get("bannerImage", ""),

        "views": e.get("views", 0),
        "status": e.get("status", "active"),

        "createdAt": e.get("createdAt").isoformat() if e.get("createdAt") else None,
    }


# ------------------------------------------------
# GET ALL EVENTS  → GET /events
# ------------------------------------------------
@event_router.get("")
def get_events(city: str | None = None, tags: str | None = None):

    query = {}

    if city:
        query["cityId"] = {"$regex": city, "$options": "i"}

    if tags:
        tag_list = [t.strip().lower() for t in tags.split(",") if t.strip()]
        query["tags"] = {"$in": tag_list}

    fetched = list(events.find(query).sort("createdAt", -1))
    return [serialize_event(e) for e in fetched]


# ------------------------------------------------
# GET SINGLE EVENT BY ID  → GET /events/{eventId}
# ------------------------------------------------
@event_router.get("/{eventId}")
def get_event(eventId: str):

    if not ObjectId.is_valid(eventId):
        raise HTTPException(400, "Invalid eventId")

    e = events.find_one({"_id": ObjectId(eventId)})
    if not e:
        raise HTTPException(404, "Event not found")

    return serialize_event(e)


# ------------------------------------------------
# CREATE EVENT  → POST /events
# ------------------------------------------------
@event_router.post("")
def create_event(payload: dict, userId: str = Depends(get_user_id)):

    # Safe date conversion
    def safe_date(value):
        try:
            return datetime.fromisoformat(value) if value else datetime.now()
        except:
            return datetime.now()

    # Required fields
    title = payload.get("title") or "Untitled Event"
    cityId = payload.get("cityId") or ""

    start_date = safe_date(payload.get("startAt"))
    end_date = safe_date(payload.get("endAt"))

    # Ensure tags is always an array
    tags = payload.get("tags", [])
    if isinstance(tags, str):
        tags = [t.strip().lower() for t in tags.split(",") if t.strip()]

    event_data = {
        "organizerId": userId,

        "title": title,
        "cityId": cityId,

        "startAt": start_date,
        "endAt": end_date,

        "tags": tags,
        "venueName": payload.get("venueName", ""),
        "location": payload.get("location", ""),

        "description": payload.get("description", ""),
        "coverImage": payload.get("coverImage", ""),
        "bannerImage": payload.get("bannerImage", ""),

        "views": 0,
        "status": "active",
        "createdAt": datetime.now(),
    }

    result = events.insert_one(event_data)

    # Fetch event again so frontend gets full data
    new_event = events.find_one({"_id": result.inserted_id})

    return {
        "message": "Event created successfully",
        "event": serialize_event(new_event)
    }


# ------------------------------------------------
# GET ALL STALLS OF EVENT  → GET /events/{eventId}/stalls
# ------------------------------------------------
@event_router.get("/{eventId}/stalls")
def get_event_stalls(eventId: str):

    if not ObjectId.is_valid(eventId):
        raise HTTPException(400, "Invalid eventId")

    stalls = list(stalls_col.find({"eventId": eventId}))

    def serialize_stall(s):
        return {
            "id": str(s["_id"]),
            "name": s.get("name") or s.get("stallName") or "",
            "tier": s.get("tier", "SILVER"),
            "price": s.get("price", 0),
            "qtyTotal": s.get("qtyTotal", 0),
            "qtyLeft": s.get("qtyLeft", 0),
            "specs": s.get("specs", ""),
        }

    return {"stalls": [serialize_stall(s) for s in stalls]}

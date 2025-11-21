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
# JWT → Get userId
# ------------------------------------------------
def get_user_id(token: str = Depends(oauth2_scheme)):
    try:
        decoded = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGO])
        return decoded.get("id")
    except:
        raise HTTPException(401, "Invalid or expired token")


# ------------------------------------------------
# SERIALIZER (FULL FE COMPATIBLE)
# ------------------------------------------------
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


# ------------------------------------------------
# GET ALL EVENTS
# ------------------------------------------------
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


# ------------------------------------------------
# GET SINGLE EVENT
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
# CREATE EVENT
# ------------------------------------------------
@event_router.post("/")
def create_event(payload: dict, userId: str = Depends(get_user_id)):

    def safe_date(v):
        try:
            return datetime.fromisoformat(v) if v else datetime.now()
        except:
            return datetime.now()

    event_data = {
        "organizerId": userId,
        "title": payload.get("title", "Untitled Event"),
        "cityId": payload.get("cityId", ""),

        "startAt": safe_date(payload.get("startAt")),
        "endAt": safe_date(payload.get("endAt")),

        "tags": payload.get("tags", []),
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
    new_event = events.find_one({"_id": result.inserted_id})

    return {"message": "Event created successfully", "event": serialize_event(new_event)}


# ------------------------------------------------
# PUBLIC STALLS
# ------------------------------------------------
@event_router.get("/{eventId}/stalls")
def get_event_stalls(eventId: str):
    if not ObjectId.is_valid(eventId):
        raise HTTPException(400, "Invalid eventId")

    found = list(stalls_col.find({"eventId": eventId}).sort("price", 1))

    return {
        "stalls": [
            {
                "id": str(s["_id"]),
                "name": s.get("name", ""),
                "tier": s.get("tier", ""),
                "price": s.get("price", 0),
                "qtyTotal": s.get("qtyTotal", 0),
                "qtyLeft": s.get("qtyLeft", 0),
                "specs": s.get("specs", ""),
            }
            for s in found
        ]
    }

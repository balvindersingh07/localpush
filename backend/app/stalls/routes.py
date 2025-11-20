from fastapi import APIRouter, HTTPException
from bson import ObjectId
from app.database import db

stall_router = APIRouter(tags=["Stalls"])

stalls_collection = db["stalls"]


# -----------------------------------------------------------
# NORMALIZER → convert MongoDB stall document to frontend-safe format
# -----------------------------------------------------------
def serialize_stall(s):
    return {
        "id": str(s.get("_id") or s.get("id")),
        "eventId": str(s.get("eventId") or ""),
        "name": s.get("name") or "",
        "tier": str(s.get("tier") or s.get("Tier") or s.get("tierName") or "SILVER").upper(),
        "price": int(s.get("price") or s.get("amount") or 0),

        "qtyTotal": int(
            s.get("qtyTotal")
            or s.get("qty_total")
            or s.get("total")
            or s.get("qtyTotalCount")
            or 0
        ),

        "qtyLeft": int(
            s.get("qtyLeft")
            or s.get("qtyleft")
            or s.get("qty_remaining")
            or s.get("qtyAvailable")
            or 0
        ),

        "specs": s.get("specs") or None,
    }


# -----------------------------------------------------------
# GET ALL STALLS FOR A SPECIFIC EVENT
# -----------------------------------------------------------
@stall_router.get("/{eventId}/stalls")
def get_stalls(eventId: str):

    # Validate ObjectId
    if not ObjectId.is_valid(eventId):
        raise HTTPException(400, "Invalid eventId")

    # Fetch stalls from Mongo
    stalls = list(stalls_collection.find({"eventId": ObjectId(eventId)}))

    # If no stalls found
    if not stalls:
        return []

    # Normalize + return
    return [serialize_stall(s) for s in stalls]

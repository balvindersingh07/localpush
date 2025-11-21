from fastapi import APIRouter, HTTPException
from bson import ObjectId

from app.database import db

stall_router = APIRouter(tags=["Stalls"])

stalls_collection = db["stalls"]


# -----------------------------------------------------------
# HELPER → serialize Mongo stall document
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


# ===========================================================
# 1) GET ALL STALLS FOR EVENT
#     Frontend: GET  /events/{eventId}/stalls
# ===========================================================
@stall_router.get("/events/{eventId}/stalls")
def get_stalls(eventId: str):
    if not ObjectId.is_valid(eventId):
        raise HTTPException(400, "Invalid eventId")

    docs = list(stalls_collection.find({"eventId": ObjectId(eventId)}))
    return [serialize_stall(s) for s in docs]


# ===========================================================
# 2) CREATE STALL FOR EVENT
#     Frontend: POST /stalls/events/{eventId}/stalls
# ===========================================================
@stall_router.post("/stalls/events/{eventId}/stalls")
def create_stall(eventId: str, payload: dict):

    if not ObjectId.is_valid(eventId):
        raise HTTPException(400, "Invalid eventId")

    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(400, "Stall name is required")

    try:
        price = int(payload.get("price") or 0)
        qty_total = int(payload.get("qtyTotal") or 0)
    except ValueError:
        raise HTTPException(400, "price and qtyTotal must be numbers")

    if qty_total < 0 or price < 0:
        raise HTTPException(400, "price and qtyTotal must be >= 0")

    tier = (payload.get("tier") or "SILVER").upper()
    specs = payload.get("specs") or ""

    doc = {
        "eventId": ObjectId(eventId),
        "name": name,
        "tier": tier,
        "price": price,
        "qtyTotal": qty_total,
        # jab create kar rahe → saari qty available
        "qtyLeft": qty_total,
        "specs": specs,
    }

    result = stalls_collection.insert_one(doc)
    created = stalls_collection.find_one({"_id": result.inserted_id})

    return {
        "message": "Stall created",
        "stall": serialize_stall(created),
    }


# ===========================================================
# 3) UPDATE STALL
#     Frontend: PATCH /stalls/stalls/{stallId}
# ===========================================================
@stall_router.patch("/stalls/stalls/{stallId}")
def update_stall(stallId: str, payload: dict):

    if not ObjectId.is_valid(stallId):
        raise HTTPException(400, "Invalid stallId")

    existing = stalls_collection.find_one({"_id": ObjectId(stallId)})
    if not existing:
        raise HTTPException(404, "Stall not found")

    update = {}

    # name
    if "name" in payload:
        update["name"] = (payload.get("name") or "").strip()

    # tier
    if "tier" in payload:
        update["tier"] = str(payload.get("tier") or "SILVER").upper()

    # price
    if "price" in payload:
        try:
            update["price"] = int(payload.get("price") or 0)
        except ValueError:
            raise HTTPException(400, "price must be a number")

    # qtyTotal → keep 'sold' same, adjust qtyLeft
    if "qtyTotal" in payload:
        try:
            new_qty_total = int(payload.get("qtyTotal") or 0)
        except ValueError:
            raise HTTPException(400, "qtyTotal must be a number")

        old_total = int(existing.get("qtyTotal") or 0)
        old_left = int(existing.get("qtyLeft") or 0)
        sold = max(0, old_total - old_left)

        update["qtyTotal"] = new_qty_total
        update["qtyLeft"] = max(0, new_qty_total - sold)

    # specs
    if "specs" in payload:
        update["specs"] = payload.get("specs") or ""

    if not update:
        return {"message": "Nothing to update"}

    stalls_collection.update_one({"_id": ObjectId(stallId)}, {"$set": update})

    updated = stalls_collection.find_one({"_id": ObjectId(stallId)})
    return {
        "message": "Stall updated",
        "stall": serialize_stall(updated),
    }


# ===========================================================
# 4) DELETE STALL
#     Frontend: DELETE /stalls/stalls/{stallId}
# ===========================================================
@stall_router.delete("/stalls/stalls/{stallId}")
def delete_stall(stallId: str):

    if not ObjectId.is_valid(stallId):
        raise HTTPException(400, "Invalid stallId")

    result = stalls_collection.delete_one({"_id": ObjectId(stallId)})

    if result.deleted_count == 0:
        raise HTTPException(404, "Stall not found")

    return {"message": "Stall deleted"}

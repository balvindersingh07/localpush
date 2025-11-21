from bson import ObjectId
from app.database import db

stalls = db["stalls"]

print("\n🔍 Starting stall fixes...\n")

fixed_event = 0
fixed_qty = 0

for s in stalls.find({}):
    stall_id = s["_id"]

    # -----------------------------
    # FIX 1: EVENT ID SHOULD BE OBJECTID
    # -----------------------------
    eventId = s.get("eventId")

    if isinstance(eventId, str):
        if ObjectId.is_valid(eventId):
            stalls.update_one(
                {"_id": stall_id},
                {"$set": {"eventId": ObjectId(eventId)}}
            )
            print(f"🟢 Converted eventId → ObjectId for stall: {stall_id}")
            fixed_event += 1
        else:
            print(f"⚠️ Skipped invalid eventId in stall {stall_id}: {eventId}")

    elif not isinstance(eventId, ObjectId):
        print(f"⚠️ Unsupported eventId format in stall {stall_id}: {eventId}")

    # -----------------------------
    # FIX 2: qtyLeft SHOULD EQUAL qtyTotal IF EMPTY
    # -----------------------------
    qty_total = s.get("qtyTotal") or s.get("qty_total") or 0
    qty_left = s.get("qtyLeft") or s.get("qty_left") or 0

    if qty_total > 0 and qty_left == 0:
        stalls.update_one(
            {"_id": stall_id},
            {"$set": {"qtyLeft": qty_total}}
        )
        print(f"🟡 Updated qtyLeft={qty_total} for stall: {stall_id}")
        fixed_qty += 1

print("\n🎉 FIX COMPLETED!")
print(f"✅ eventId conversions: {fixed_event}")
print(f"✅ qtyLeft updates:   {fixed_qty}")
print("\n-----------------------------------")

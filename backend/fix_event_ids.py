from bson import ObjectId
from app.database import db

stalls = db["stalls"]

print("🔍 Fixing stall eventId fields...")

count = 0

for s in stalls.find({}):
    eventId = s.get("eventId")

    # If eventId already ObjectId → skip
    if isinstance(eventId, ObjectId):
        continue

    # If invalid or empty → skip
    if not eventId or not ObjectId.is_valid(str(eventId)):
        print(f"⚠️ Invalid eventId in stall {s['_id']}: {eventId}")
        continue

    # Convert to ObjectId
    stalls.update_one(
        {"_id": s["_id"]},
        {"$set": {"eventId": ObjectId(eventId)}}
    )

    print(f"✅ Updated stall {s['_id']} eventId={eventId}")
    count += 1

print(f"\n🎉 Completed! Fixed {count} stalls")

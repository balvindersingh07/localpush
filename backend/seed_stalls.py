# seed_stalls.py  (place inside backend folder)

from app.database import db
from bson import ObjectId

events = db["events"]
stalls = db["stalls"]

def seed_stalls():
    all_events = list(events.find({}))
    if not all_events:
        print("❌ No events found in DB. Create an event first.")
        return

    for e in all_events:
        eventId = str(e["_id"])
        print(f"➡️ Adding stalls for event: {eventId} ({e.get('title')})")

        sample_stalls = [
            {
                "eventId": eventId,
                "name": "G1",
                "tier": "GOLD",
                "price": 12000,
                "qtyTotal": 10,
                "qtyLeft": 10
            },
            {
                "eventId": eventId,
                "name": "S1",
                "tier": "SILVER",
                "price": 8000,
                "qtyTotal": 15,
                "qtyLeft": 15
            },
            {
                "eventId": eventId,
                "name": "B1",
                "tier": "BRONZE",
                "price": 5000,
                "qtyTotal": 20,
                "qtyLeft": 20
            }
        ]

        for s in sample_stalls:
            stalls.insert_one(s)

    print("✅ Stall seeding complete!")


if __name__ == "__main__":
    seed_stalls()

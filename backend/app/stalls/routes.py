from fastapi import APIRouter

stall_router = APIRouter(tags=["Stalls"])

STALLS = [
    {
        "id": "101",
        "eventId": "1",
        "tier": "BRONZE",
        "price": 500,
        "qtyLeft": 8,
        "qtyTotal": 20
    },
    {
        "id": "102",
        "eventId": "1",
        "tier": "SILVER",
        "price": 1200,
        "qtyLeft": 3,
        "qtyTotal": 10
    }
]

@stall_router.get("/{event_id}/stalls")
def get_stalls(event_id: str):
    return [s for s in STALLS if s["eventId"] == event_id]

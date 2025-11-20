from pydantic import BaseModel
from typing import Optional


class EventSchema(BaseModel):
    title: str
    cityId: str
    startAt: Optional[str]
    endAt: Optional[str]


class StallSchema(BaseModel):
    name: str
    tier: str
    price: int


class BookingResponse(BaseModel):
    id: str
    status: str
    amount: int
    event: EventSchema
    stall: StallSchema
    createdAt: Optional[str]


class ReviewRequest(BaseModel):
    rating: int
    reviewText: Optional[str] = None


class InvoiceResponse(BaseModel):
    bookingId: str
    invoiceUrl: str
    amount: int
    eventTitle: str
    stallName: str
    date: str

# app/admin/schemas.py

from pydantic import BaseModel
from typing import List, Optional


class StatsResponse(BaseModel):
    total_creators: int
    total_organizers: int
    total_users: int


class ListingItem(BaseModel):
    id: str
    title: str
    image: str
    price: float


class PaymentOverview(BaseModel):
    total_revenue: float
    monthly_revenue: List[float]


class PayoutItem(BaseModel):
    id: str
    user: str
    amount: float
    status: str  # pending / completed

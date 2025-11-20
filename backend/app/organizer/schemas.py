# app/organizer/schemas.py
from pydantic import BaseModel
from typing import Optional, List


class OrganizerProfile(BaseModel):
    brandName: Optional[str] = ""
    gst: Optional[str] = ""
    contactPerson: Optional[str] = ""
    phone: Optional[str] = ""
    about: Optional[str] = ""
    policies: Optional[str] = ""


class VenueCreate(BaseModel):
    name: str
    city: str
    description: Optional[str] = ""
    tier: str


class KycUpdate(BaseModel):
    gstDoc: Optional[str] = None
    idDoc: Optional[str] = None

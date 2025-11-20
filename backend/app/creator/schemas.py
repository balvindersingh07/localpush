from pydantic import BaseModel
from typing import List, Optional


# ---------------------------------------------------
# PROFILE SCHEMAS
# ---------------------------------------------------

class CreatorProfileCreate(BaseModel):
    fullName: str
    phone: str
    bio: Optional[str] = ""
    skills: List[str] = []
    city: Optional[str] = ""
    minPrice: Optional[int] = 0
    maxPrice: Optional[int] = 0


class CreatorProfileUpdate(BaseModel):
    fullName: Optional[str]
    phone: Optional[str]
    bio: Optional[str]
    skills: Optional[List[str]]
    city: Optional[str]
    minPrice: Optional[int]
    maxPrice: Optional[int]


class CreatorProfileResponse(BaseModel):
    id: str
    userId: str
    fullName: str
    phone: str
    bio: str
    skills: List[str]
    city: str
    minPrice: int
    maxPrice: int
    rating: float
    totalBookings: int
    profileComplete: int


# ---------------------------------------------------
# AVATAR UPLOAD RESPONSE
# ---------------------------------------------------

class AvatarUploadResponse(BaseModel):
    message: str
    url: str


# ---------------------------------------------------
# PORTFOLIO SCHEMAS
# ---------------------------------------------------

class PortfolioUploadRequest(BaseModel):
    title: Optional[str] = ""
    url: str


class PortfolioItem(BaseModel):
    id: str
    userId: str
    title: Optional[str]
    url: str


class PortfolioDeleteResponse(BaseModel):
    message: str


# ---------------------------------------------------
# BOOKINGS SCHEMA
# ---------------------------------------------------

class CreatorBookingItem(BaseModel):
    id: str
    eventTitle: str
    eventDate: str
    status: str
    amount: int


# ---------------------------------------------------
# KYC SCHEMAS (UPDATED FOR REAL BACKEND)
# ---------------------------------------------------

# Creator submits full KYC form
class KYCSubmit(BaseModel):
    aadhaarNumber: str
    panNumber: str
    bankName: str
    accountNumber: str
    ifsc: str


# Creator sees complete KYC details
class CreatorKYCResponse(BaseModel):
    id: str
    userId: str
    status: str

    aadhaar: Optional[str] = ""
    pan: Optional[str] = ""
    bankName: Optional[str] = ""
    accountNumber: Optional[str] = ""
    ifsc: Optional[str] = ""

    # Image paths
    aadhaar_front: Optional[str] = ""
    aadhaar_back: Optional[str] = ""
    pan_image: Optional[str] = ""

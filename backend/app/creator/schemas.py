# app/creator/schemas.py
from typing import List, Optional
from pydantic import BaseModel


class CreatorProfileBase(BaseModel):
    fullName: Optional[str] = ""
    phone: Optional[str] = ""
    bio: Optional[str] = ""
    cityId: Optional[str] = ""
    minPrice: Optional[int] = 0
    maxPrice: Optional[int] = 0
    tags: List[str] = []


class CreatorProfileUpdate(CreatorProfileBase):
    pass


class AvatarUploadResponse(BaseModel):
    message: str
    url: str


class CreatorKyc(BaseModel):
    aadhaar: str
    pan: str
    bankName: str
    accountNumber: str
    ifsc: str

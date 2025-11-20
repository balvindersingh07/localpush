from pydantic import BaseModel, EmailStr, Field
from typing import Optional


# -----------------------------
# USER CREATE (SIGNUP)
# -----------------------------
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str  # CREATOR / ORGANIZER / ADMIN


# -----------------------------
# LOGIN MODEL
# -----------------------------
class UserLogin(BaseModel):
    email: EmailStr
    password: str


# -----------------------------
# USER OUTPUT (WHAT WE RETURN)
# -----------------------------
class UserOut(BaseModel):
    id: str = Field(..., alias="_id")
    name: str
    email: str
    role: str

    class Config:
        populate_by_name = True  # allows "_id" → "id"


# -----------------------------
# TOKEN RESPONSE
# -----------------------------
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

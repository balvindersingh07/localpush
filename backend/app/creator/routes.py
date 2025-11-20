from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from jose import jwt
from bson import ObjectId
from typing import List
import uuid, os

from app.config import settings
from app.auth.routes import oauth2_scheme

from .models import (
    creators_collection,
    profile_complete,
    portfolio_collection,
    kyc_collection
)

from .schemas import (
    CreatorProfileCreate,
    CreatorProfileUpdate,
    AvatarUploadResponse
)

# 👉 Creator Router
creator_router = APIRouter(tags=["Creator"])


# ---------------------------------------------------------
# JWT → Extract userId
# ---------------------------------------------------------
def get_user_id(token: str = Depends(oauth2_scheme)):
    try:
        decoded = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGO])
        return decoded.get("id")
    except:
        raise HTTPException(401, "Invalid or expired token")


# ---------------------------------------------------------
# /creator/me
# ---------------------------------------------------------
@creator_router.get("/me")
def get_creator_me(userId: str = Depends(get_user_id)):
    profile = creators_collection.find_one({"userId": userId})
    if not profile:
        return {"exists": False, "message": "Please create profile"}

    profile["id"] = str(profile["_id"])
    profile["profileComplete"] = profile_complete(profile)
    return profile


# ---------------------------------------------------------
# CREATE PROFILE
# ---------------------------------------------------------
@creator_router.post("/create")
def create_profile(data: CreatorProfileCreate, userId: str = Depends(get_user_id)):

    if creators_collection.find_one({"userId": userId}):
        raise HTTPException(400, "Profile already exists")

    doc = data.dict()
    doc["userId"] = userId
    doc["rating"] = 4.8
    doc["totalBookings"] = 0
    doc["avatar"] = ""

    res = creators_collection.insert_one(doc)
    return {"message": "Profile created", "id": str(res.inserted_id)}


# ---------------------------------------------------------
# UPDATE PROFILE
# ---------------------------------------------------------
@creator_router.patch("/update")
def update_profile(data: CreatorProfileUpdate, userId: str = Depends(get_user_id)):

    if not creators_collection.find_one({"userId": userId}):
        raise HTTPException(404, "Profile not found")

    update_fields = {k: v for k, v in data.dict().items() if v is not None}
    creators_collection.update_one({"userId": userId}, {"$set": update_fields})

    return {"message": "Profile updated"}


# ---------------------------------------------------------
# AVATAR UPLOAD
# ---------------------------------------------------------
@creator_router.post("/avatar", response_model=AvatarUploadResponse)
async def upload_avatar(file: UploadFile = File(...), userId: str = Depends(get_user_id)):

    os.makedirs("uploads", exist_ok=True)

    fname = f"avatar_{userId}_{uuid.uuid4()}.jpg"
    content = await file.read()

    with open(f"uploads/{fname}", "wb") as f:
        f.write(content)

    creators_collection.update_one({"userId": userId}, {"$set": {"avatar": fname}})
    return {"message": "Avatar uploaded", "url": fname}


# ---------------------------------------------------------
# PORTFOLIO UPLOAD
# ---------------------------------------------------------
@creator_router.post("/portfolio")
async def upload_portfolio(files: List[UploadFile] = File(...), userId: str = Depends(get_user_id)):

    os.makedirs("uploads", exist_ok=True)
    uploaded = []

    for f in files:
        fname = f"portfolio_{userId}_{uuid.uuid4()}.jpg"
        data = await f.read()

        with open(f"uploads/{fname}", "wb") as out:
            out.write(data)

        portfolio_collection.insert_one({
            "userId": userId,
            "url": fname,
            "title": f.filename
        })
        uploaded.append(fname)

    return {"message": "Uploaded", "images": uploaded}


# ---------------------------------------------------------
# PORTFOLIO LIST
# ---------------------------------------------------------
@creator_router.get("/portfolio")
def list_portfolio(userId: str = Depends(get_user_id)):
    items = list(portfolio_collection.find({"userId": userId}))
    return [
        {
            "id": str(i["_id"]),
            "url": i["url"],
            "title": i.get("title")
        } for i in items
    ]


# ---------------------------------------------------------
# PORTFOLIO DELETE
# ---------------------------------------------------------
@creator_router.delete("/portfolio/{itemId}")
def delete_portfolio(itemId: str, userId: str = Depends(get_user_id)):

    item = portfolio_collection.find_one({"_id": ObjectId(itemId)})
    if not item:
        raise HTTPException(404, "Not found")

    if item["userId"] != userId:
        raise HTTPException(403, "Unauthorized")

    portfolio_collection.delete_one({"_id": ObjectId(itemId)})
    return {"message": "Deleted"}


# ---------------------------------------------------------
# BOOKINGS LIST → React calls /creator/bookings/my
# ---------------------------------------------------------
from app.bookings.models import bookings_collection  # ✅ CORRECT IMPORT

@creator_router.get("/bookings/my")
def bookings_my(userId: str = Depends(get_user_id)):

    bookings = bookings_collection.find({"creatorId": userId})
    result = []

    for b in bookings:
        event = b.get("event", {})
        stall = b.get("stall", {})

        result.append({
            "id": str(b["_id"]),
            "status": b.get("status", "PAID"),
            "amount": b.get("amount", stall.get("price")),
            "event": {
                "title": event.get("title"),
                "cityId": event.get("cityId"),
                "startAt": event.get("startAt"),
                "endAt": event.get("endAt")
            },
            "stall": {
                "name": stall.get("name"),
                "tier": stall.get("tier"),
                "price": stall.get("price")
            }
        })

    return result


# ---------------------------------------------------------
# KYC SUBMIT
# ---------------------------------------------------------
@creator_router.post("/kyc/submit")
async def submit_kyc(
    aadhaar: str = Form(...),
    pan: str = Form(...),
    bankName: str = Form(...),
    accountNumber: str = Form(...),
    ifsc: str = Form(...),
    userId: str = Depends(get_user_id)
):

    data = {
        "userId": userId,
        "aadhaar": aadhaar,
        "pan": pan,
        "bankName": bankName,
        "accountNumber": accountNumber,
        "ifsc": ifsc,
        "status": "pending"
    }

    if kyc_collection.find_one({"userId": userId}):
        kyc_collection.update_one({"userId": userId}, {"$set": data})
    else:
        kyc_collection.insert_one(data)

    return {"message": "KYC submitted", "status": "pending"}


# ---------------------------------------------------------
# KYC VIEW
# ---------------------------------------------------------
@creator_router.get("/kyc")
def view_kyc(userId: str = Depends(get_user_id)):

    kyc = kyc_collection.find_one({"userId": userId})
    if not kyc:
        return {"verified": False, "message": "KYC not submitted"}

    kyc["id"] = str(kyc["_id"])
    return kyc

# app/creator/routes.py
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from jose import jwt
from bson import ObjectId
from typing import List
import uuid
import os

from app.config import settings
from app.auth.routes import oauth2_scheme
from app.database import users_collection

from .models import (
    creators_collection,
    profile_complete,
    portfolio_collection,
    kyc_collection,
)
from .schemas import (
    CreatorProfileUpdate,
    AvatarUploadResponse,
    CreatorKyc,
)

creator_router = APIRouter(tags=["Creator"])


# ---------------------------------------------------------
# JWT → userId
# ---------------------------------------------------------
def get_user_id(token: str = Depends(oauth2_scheme)):
    try:
        decoded = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGO]
        )
        return decoded.get("id")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# ---------------------------------------------------------
# GET /creator/me
#  → user + profile combined
# ---------------------------------------------------------
@creator_router.get("/me")
def get_creator_me(userId: str = Depends(get_user_id)):
    user = users_collection.find_one({"_id": ObjectId(userId)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile = creators_collection.find_one({"userId": userId})

    # if no profile → create basic one
    if not profile:
        base_profile = {
            "userId": userId,
            "fullName": user.get("name", ""),
            "phone": "",
            "bio": "",
            "cityId": "",
            "minPrice": 0,
            "maxPrice": 0,
            "tags": [],
            "avatar": "",
            "rating": 4.8,
            "totalBookings": 0,
        }
        res = creators_collection.insert_one(base_profile)
        base_profile["_id"] = res.inserted_id
        profile = base_profile

    completion = profile_complete(profile)

    return {
        "id": userId,
        "name": profile.get("fullName") or user.get("name", ""),
        "email": user.get("email", ""),
        "phone": profile.get("phone", ""),
        "bio": profile.get("bio", ""),
        "cityId": profile.get("cityId", ""),
        "minPrice": profile.get("minPrice", 0),
        "maxPrice": profile.get("maxPrice", 0),
        "tags": profile.get("tags", []),
        "avatar": profile.get("avatar", ""),
        "rating": profile.get("rating", 4.8),
        "totalBookings": profile.get("totalBookings", 0),
        "profileComplete": completion,
    }


# ---------------------------------------------------------
# PATCH /creator/me
#  → update profile (and user.name)
# ---------------------------------------------------------
@creator_router.patch("/me")
def update_profile(data: CreatorProfileUpdate, userId: str = Depends(get_user_id)):
    user = users_collection.find_one({"_id": ObjectId(userId)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile = creators_collection.find_one({"userId": userId})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    update_fields = {}

    # profile fields
    if data.fullName is not None:
        update_fields["fullName"] = data.fullName
    if data.phone is not None:
        update_fields["phone"] = data.phone
    if data.bio is not None:
        update_fields["bio"] = data.bio
    if data.cityId is not None:
        update_fields["cityId"] = data.cityId
    if data.minPrice is not None:
        update_fields["minPrice"] = data.minPrice
    if data.maxPrice is not None:
        update_fields["maxPrice"] = data.maxPrice
    if data.tags is not None:
        update_fields["tags"] = data.tags

    if update_fields:
        creators_collection.update_one(
            {"userId": userId},
            {"$set": update_fields},
        )

    # also sync user.name with fullName
    if data.fullName:
        users_collection.update_one(
            {"_id": ObjectId(userId)}, {"$set": {"name": data.fullName}}
        )

    return {"message": "Profile updated"}


# ---------------------------------------------------------
# POST /creator/avatar
# ---------------------------------------------------------
@creator_router.post("/avatar", response_model=AvatarUploadResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    userId: str = Depends(get_user_id),
):
    os.makedirs("uploads", exist_ok=True)

    ext = os.path.splitext(file.filename or "")[1] or ".jpg"
    fname = f"avatar_{userId}_{uuid.uuid4()}{ext}"
    path = os.path.join("uploads", fname)

    content = await file.read()
    with open(path, "wb") as f:
        f.write(content)

    creators_collection.update_one(
        {"userId": userId},
        {"$set": {"avatar": fname}},
        upsert=True,
    )

    return {"message": "Avatar uploaded", "url": fname}


# ---------------------------------------------------------
# PORTFOLIO UPLOAD/LIST/DELETE
# ---------------------------------------------------------
@creator_router.post("/portfolio")
async def upload_portfolio(
    files: List[UploadFile] = File(...),
    userId: str = Depends(get_user_id),
):
    os.makedirs("uploads", exist_ok=True)
    uploaded = []

    for f in files:
        ext = os.path.splitext(f.filename or "")[1] or ".jpg"
        fname = f"portfolio_{userId}_{uuid.uuid4()}{ext}"
        path = os.path.join("uploads", fname)

        data = await f.read()
        with open(path, "wb") as out:
            out.write(data)

        portfolio_collection.insert_one(
            {
                "userId": userId,
                "url": fname,
                "title": f.filename,
            }
        )
        uploaded.append(fname)

    return {"message": "Uploaded", "images": uploaded}


@creator_router.get("/portfolio")
def list_portfolio(userId: str = Depends(get_user_id)):
    items = list(portfolio_collection.find({"userId": userId}))
    return [
        {
            "id": str(i["_id"]),
            "url": i["url"],
            "title": i.get("title", ""),
        }
        for i in items
    ]


@creator_router.delete("/portfolio/{itemId}")
def delete_portfolio(itemId: str, userId: str = Depends(get_user_id)):
    from bson import ObjectId

    item = portfolio_collection.find_one({"_id": ObjectId(itemId)})
    if not item:
        raise HTTPException(status_code=404, detail="Not found")

    if item["userId"] != userId:
        raise HTTPException(status_code=403, detail="Unauthorized")

    portfolio_collection.delete_one({"_id": ObjectId(itemId)})
    return {"message": "Deleted"}


# ---------------------------------------------------------
# KYC SUBMIT + VIEW
# ---------------------------------------------------------
@creator_router.post("/kyc/submit")
def submit_kyc(payload: CreatorKyc, userId: str = Depends(get_user_id)):
    data = {
        "userId": userId,
        "aadhaar": payload.aadhaar,
        "pan": payload.pan,
        "bankName": payload.bankName,
        "accountNumber": payload.accountNumber,
        "ifsc": payload.ifsc,
        "status": "pending",
    }

    existing = kyc_collection.find_one({"userId": userId})
    if existing:
        kyc_collection.update_one({"userId": userId}, {"$set": data})
    else:
        kyc_collection.insert_one(data)

    return {"message": "KYC submitted", "status": "pending"}


@creator_router.get("/kyc")
def view_kyc(userId: str = Depends(get_user_id)):
    kyc = kyc_collection.find_one({"userId": userId})
    if not kyc:
        return {"verified": False, "status": None, "message": "KYC not submitted"}

    return {
        "id": str(kyc["_id"]),
        "status": kyc.get("status", "pending"),
        "aadhaar": kyc.get("aadhaar"),
        "pan": kyc.get("pan"),
        "bankName": kyc.get("bankName"),
        "accountNumber": kyc.get("accountNumber"),
        "ifsc": kyc.get("ifsc"),
    }

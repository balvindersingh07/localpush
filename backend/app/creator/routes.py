# app/creator/routes.py

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from jose import jwt
from bson import ObjectId
from typing import List
import cloudinary
import cloudinary.uploader

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
# CLOUDINARY CONFIG
# ---------------------------------------------------------
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True
)


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
# ---------------------------------------------------------
@creator_router.get("/me")
def get_creator_me(userId: str = Depends(get_user_id)):
    user = users_collection.find_one({"_id": ObjectId(userId)})
    if not user:
        raise HTTPException(404, "User not found")

    profile = creators_collection.find_one({"userId": userId})

    if not profile:
        profile = {
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
        creators_collection.insert_one(profile)

    completion = profile_complete(profile)

    return {
        "id": userId,
        "fullName": profile.get("fullName", ""),
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
# ---------------------------------------------------------
@creator_router.patch("/me")
def update_profile(data: CreatorProfileUpdate, userId: str = Depends(get_user_id)):

    profile = creators_collection.find_one({"userId": userId})
    if not profile:
        raise HTTPException(404, "Profile not found")

    update_fields = {k: v for k, v in data.dict().items() if v is not None}

    if update_fields:
        creators_collection.update_one(
            {"userId": userId},
            {"$set": update_fields},
        )

    if data.fullName:
        users_collection.update_one(
            {"_id": ObjectId(userId)},
            {"$set": {"name": data.fullName}},
        )

    return {"message": "Profile updated"}


# ---------------------------------------------------------
# POST /creator/avatar  (CLOUDINARY VERSION)
# ---------------------------------------------------------
@creator_router.post("/avatar", response_model=AvatarUploadResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    userId: str = Depends(get_user_id),
):

    try:
        result = cloudinary.uploader.upload(
            await file.read(),
            folder=f"localpush/avatars/{userId}",
            public_id=f"avatar_{userId}",
            overwrite=True,
        )

        img_url = result["secure_url"]

        creators_collection.update_one(
            {"userId": userId},
            {"$set": {"avatar": img_url}},
            upsert=True,
        )

        return {"message": "Avatar uploaded", "url": img_url}

    except Exception as e:
        raise HTTPException(500, f"Cloudinary upload failed: {str(e)}")


# ---------------------------------------------------------
# PORTFOLIO UPLOAD (CLOUDINARY VERSION)
# ---------------------------------------------------------
@creator_router.post("/portfolio")
async def upload_portfolio(
    files: List[UploadFile] = File(...),
    userId: str = Depends(get_user_id),
):

    uploaded_urls = []
    uploaded_ids = []

    for file in files:
        try:
            result = cloudinary.uploader.upload(
                await file.read(),
                folder=f"localpush/portfolio/{userId}"
            )

            img_url = result["secure_url"]

            res = portfolio_collection.insert_one({
                "userId": userId,
                "url": img_url,
                "title": file.filename,
            })

            uploaded_urls.append(img_url)
            uploaded_ids.append(str(res.inserted_id))

        except Exception as e:
            raise HTTPException(500, f"Failed: {e}")

    return {
        "message": "Uploaded",
        "images": uploaded_urls,
        "ids": uploaded_ids,
    }


# ---------------------------------------------------------
# LIST PORTFOLIO
# ---------------------------------------------------------
@creator_router.get("/portfolio")
def list_portfolio(userId: str = Depends(get_user_id)):
    items = portfolio_collection.find({"userId": userId})
    return [
        {
            "id": str(item["_id"]),
            "url": item["url"],
            "title": item.get("title", ""),
        }
        for item in items
    ]


# ---------------------------------------------------------
# DELETE PORTFOLIO
# ---------------------------------------------------------
@creator_router.delete("/portfolio/{itemId}")
def delete_portfolio(itemId: str, userId: str = Depends(get_user_id)):

    item = portfolio_collection.find_one({"_id": ObjectId(itemId)})
    if not item:
        raise HTTPException(404, "Item not found")

    if item["userId"] != userId:
        raise HTTPException(403, "Unauthorized")

    portfolio_collection.delete_one({"_id": ObjectId(itemId)})
    return {"message": "Deleted"}


# ---------------------------------------------------------
# KYC
# ---------------------------------------------------------
@creator_router.post("/kyc/submit")
def submit_kyc(payload: CreatorKyc, userId: str = Depends(get_user_id)):

    data = payload.dict()
    data["userId"] = userId
    data["status"] = "pending"

    kyc_collection.update_one(
        {"userId": userId},
        {"$set": data},
        upsert=True,
    )

    return {"message": "KYC submitted", "status": "pending"}


@creator_router.get("/kyc")
def view_kyc(userId: str = Depends(get_user_id)):

    kyc = kyc_collection.find_one({"userId": userId})
    if not kyc:
        return {"status": None, "message": "KYC not submitted"}

    return {
        "id": str(kyc["_id"]),
        "status": kyc.get("status", "pending"),
        "aadhaar": kyc.get("aadhaar"),
        "pan": kyc.get("pan"),
        "bankName": kyc.get("bankName"),
        "accountNumber": kyc.get("accountNumber"),
        "ifsc": kyc.get("ifsc"),
    }

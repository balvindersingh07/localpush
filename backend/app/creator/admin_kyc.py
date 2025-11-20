from fastapi import APIRouter, HTTPException
from bson import ObjectId
from app.creator.models import kyc_collection

admin_kyc_router = APIRouter(tags=["Admin KYC"])

# APPROVE KYC
@admin_kyc_router.patch("/admin/kyc/{kycId}/approve")
def approve_kyc(kycId: str):
    kyc = kyc_collection.find_one({"_id": ObjectId(kycId)})
    if not kyc:
        raise HTTPException(404, "KYC record not found")

    kyc_collection.update_one(
        {"_id": ObjectId(kycId)},
        {"$set": {"status": "approved"}}
    )

    return {"message": "KYC approved"}

# REJECT KYC
@admin_kyc_router.patch("/admin/kyc/{kycId}/reject")
def reject_kyc(kycId: str):
    kyc = kyc_collection.find_one({"_id": ObjectId(kycId)})
    if not kyc:
        raise HTTPException(404, "KYC record not found")

    kyc_collection.update_one(
        {"_id": ObjectId(kycId)},
        {"$set": {"status": "rejected"}}
    )

    return {"message": "KYC rejected"}

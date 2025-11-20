# app/creator/models.py

from app.database import db

# main creator profile
creators_collection = db["creator_profile"]

# portfolio (each image = one row)
portfolio_collection = db["creator_portfolio"]

# KYC records
kyc_collection = db["creator_kyc"]


def profile_complete(profile: dict) -> int:
    """
    Simple completion score for frontend progress bar.
    """
    fields = ["fullName", "phone", "bio", "cityId", "minPrice", "maxPrice", "tags"]

    if not profile:
        return 0

    filled = 0
    for f in fields:
        val = profile.get(f)
        if val:
            if isinstance(val, list):
                if len(val) > 0:
                    filled += 1
            else:
                filled += 1

    return int((filled / len(fields)) * 100)

# app/creator/models.py

from app.database import db

creators_collection = db["creator_profile"]
portfolio_collection = db["creator_portfolio"]
kyc_collection = db["creator_kyc"]


def profile_complete(profile: dict) -> int:
    fields = ["fullName", "phone", "bio", "cityId", "minPrice", "maxPrice", "tags"]

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

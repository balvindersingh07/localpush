# app/creator/models.py
from app.database import db

# ------------------------------------
# CREATOR MAIN PROFILE
# ------------------------------------
# 🔹 New collection: auto-create hovegi jado first document insert hoyega
creators_collection = db["creator_profile"]


def profile_complete(profile: dict) -> int:
    """
    Simple completion score for frontend progress bar.
    """
    fields = ["fullName", "phone", "bio", "cityId", "minPrice", "maxPrice", "tags"]
    if not profile:
        return 0

    filled = 0
    for f in fields:
        value = profile.get(f)
        if value:
            # list / tags length check
            if isinstance(value, (list, dict)):
                if len(value) > 0:
                    filled += 1
            else:
                filled += 1

    return int((filled / len(fields)) * 100)


# ------------------------------------
# PORTFOLIO IMAGES
# ------------------------------------
portfolio_collection = db["creator_portfolio"]  # ✅ same as Mongo collection


# ------------------------------------
# CREATOR KYC DATA
# ------------------------------------
kyc_collection = db["creator_kyc"]  # 🔹 navi collection, auto-create on first insert

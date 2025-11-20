from bson import ObjectId
from app.database import db

# ---------------------------------------------------
# CREATOR MAIN PROFILE
# ---------------------------------------------------
creators_collection = db["creators_profile"]

def profile_complete(profile: dict) -> int:
    fields = ["fullName", "phone", "bio", "skills", "city"]
    filled = sum(1 for f in fields if profile.get(f))
    return int((filled / len(fields)) * 100)


# ---------------------------------------------------
# PORTFOLIO IMAGES (each row = one image)
# ---------------------------------------------------
portfolio_collection = db["creator_portfolio"]


# ---------------------------------------------------
# CREATOR BOOKINGS (assigned from organizer events)
# ---------------------------------------------------
bookings_collection = db["creator_bookings"]


# ---------------------------------------------------
# CREATOR KYC DATA
# ---------------------------------------------------
kyc_collection = db["creator_kyc"]

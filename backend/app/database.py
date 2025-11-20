# app/database.py

from pymongo import MongoClient
from dotenv import load_dotenv
import os

# Load .env file
load_dotenv()

# Get Mongo URI
MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    raise Exception("❌ MONGO_URI not found in .env file")

# Connect client
client = MongoClient(MONGO_URI)

# Choose database
db = client["sharthi_db"]

# ---------------------------------------
# COLLECTIONS (ALL IN ONE PLACE)
# ---------------------------------------

users_collection = db["users"]
events_collection = db["events"]
stalls_collection = db["stalls"]
bookings_collection = db["bookings"]

# Organizer related
organizers_collection = db["organizers"]
venues_collection = db["venues"]

# Financials
payments_collection = db["payments"]
payouts_collection = db["payouts"]

# Optional future tables
notifications_collection = db["notifications"]  # if you ever add
support_tickets_collection = db["support_tickets"]  # optional

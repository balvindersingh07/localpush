from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Routers import
from app.auth.routes import auth_router
from app.events.routes import event_router
from app.bookings.routes import booking_router
from app.organizer.routes import organizer_router
from app.admin.routes import admin_router
from app.chatbot.routes import chatbot_router
from app.stalls.routes import stall_router
from app.creator.routes import creator_router
from app.creator.admin_kyc import admin_kyc_router

# -------------------------------------------------
# 🚀 APP CONFIG
# -------------------------------------------------
app = FastAPI(
    title="Sharthi API",
    version="1.0",
    description="Backend service for Sharthi platform"
)

# -------------------------------------------------
# 🔥 CORS CONFIG (CORRECT FOR RENDER + VERCEL)
# -------------------------------------------------

origins = [
    "https://localpush.vercel.app",  # your frontend
    "http://localhost:3000",         # local testing
    "https://localpush.onrender.com" # backend self-call safety
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # specific origins for production
    allow_credentials=True,      # needed for JWT / cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------
# 🔥 REGISTER ROUTERS (CLEAN)
# -------------------------------------------------

# AUTH
app.include_router(auth_router, prefix="/auth")

# EVENTS (event list, details etc.)
app.include_router(event_router, prefix="/events")

# STALLS (events/:id/stalls)
app.include_router(stall_router, prefix="/events")

# BOOKINGS
app.include_router(booking_router, prefix="/bookings")

# ORGANIZER
app.include_router(organizer_router, prefix="/organizer")

# CREATOR
app.include_router(creator_router, prefix="/creator")

# ADMIN
app.include_router(admin_router, prefix="/admin")

# ADMIN KYC
app.include_router(admin_kyc_router, prefix="/admin/kyc")

# CHATBOT
app.include_router(chatbot_router, prefix="/chatbot")


# -------------------------------------------------
# 🏠 ROOT ENDPOINT
# -------------------------------------------------
@app.get("/")
def root():
    return {"message": "Sharthi API is running successfully!"}


# -------------------------------------------------
# 🚀 MAIN ENTRY POINT (REQUIRED BY RENDER)
# -------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000)

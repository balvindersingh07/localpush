from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ROUTERS
from app.auth.routes import auth_router
from app.events.routes import event_router
from app.stalls.routes import stall_router
from app.bookings.routes import booking_router
from app.organizer.routes import organizer_router
from app.admin.routes import admin_router
from app.chatbot.routes import chatbot_router
from app.creator.routes import creator_router
from app.creator.admin_kyc import admin_kyc_router

app = FastAPI(
    title="Sharthi API",
    version="1.0",
    description="Backend service for Sharthi platform"
)

# -----------------------------
# CORS
# -----------------------------
origins = [
    "https://localpush.vercel.app",
    "http://localhost:3000",
    "https://localpush.onrender.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# SERVE UPLOADED FILES
# -----------------------------
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# -----------------------------
# REGISTER ROUTERS
# -----------------------------

# /auth/*
app.include_router(auth_router, prefix="/auth")

# /events/*
app.include_router(event_router, prefix="/events")

# ❗STALLS NEED NESTED ROUTES  
#    /events/{eventId}/stalls
app.include_router(stall_router, prefix="/events")

# /bookings/*
app.include_router(booking_router, prefix="/bookings")

# /organizer/*
app.include_router(organizer_router, prefix="/organizer")

# /creator/*
app.include_router(creator_router, prefix="/creator")

# /admin/*
app.include_router(admin_router, prefix="/admin")

# /admin/kyc/*
app.include_router(admin_kyc_router, prefix="/admin/kyc")

# /chatbot/*
app.include_router(chatbot_router, prefix="/chatbot")


@app.get("/")
def root():
    return {"message": "Sharthi API running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000)

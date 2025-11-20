from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from bson import ObjectId

from app.auth.schemas import UserCreate, UserLogin, TokenResponse
from app.auth.utils import hash_password, verify_password, create_access_token
from app.database import users_collection
from app.config import settings

auth_router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ----------------------------------------------------
# SIGNUP (FULLY FIXED)
# ----------------------------------------------------
@auth_router.post("/signup")
def signup(data: UserCreate):

    # 1. Email exists?
    if users_collection.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Safe hash of password ONLY
    hashed_password = hash_password(data.password)

    # 3. Insert user
    new_user = {
        "name": data.name,
        "email": data.email,
        "password": hashed_password,
        "role": data.role.upper()  # CREATOR / ORGANIZER
    }

    result = users_collection.insert_one(new_user)

    return {
        "message": "User created successfully",
        "id": str(result.inserted_id),
    }


# ----------------------------------------------------
# LOGIN
# ----------------------------------------------------
@auth_router.post("/login", response_model=TokenResponse)
def login(data: UserLogin):

    user = users_collection.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid credentials")

    # ADMIN LOCK
    if user["role"].upper() == "ADMIN":
        if user["email"] != "admin@localpush.com":
            raise HTTPException(status_code=401, detail="Unauthorized admin login")

    # Validate password
    if not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    # Token generate
    token = create_access_token({
        "id": str(user["_id"]),
        "role": user["role"],
    })

    return {"access_token": token, "token_type": "bearer"}


# ----------------------------------------------------
# GET CURRENT USER
# ----------------------------------------------------
@auth_router.get("/me")
def get_me(token: str = Depends(oauth2_scheme)):

    try:
        decoded = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGO]
        )

        user = users_collection.find_one({"_id": ObjectId(decoded["id"])})

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
        }

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

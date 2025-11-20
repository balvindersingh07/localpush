from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from bson import ObjectId
from app.auth.schemas import UserCreate, UserLogin, TokenResponse
from app.auth.utils import hash_password, verify_password, create_access_token
from app.database import users_collection
from app.config import settings

auth_router = APIRouter()

# Standard FastAPI way to read Bearer token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ----------------------------------------------------
# SIGNUP
# ----------------------------------------------------
@auth_router.post("/signup")
def signup(data: UserCreate):
    # check if already exists
    existing = users_collection.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = hash_password(data.password)

    new_user = {
        "name": data.name,
        "email": data.email,
        "password": hashed,
        "role": data.role.upper(),  # CREATOR / ORGANIZER only
    }

    result = users_collection.insert_one(new_user)

    return {
        "message": "User created successfully",
        "id": str(result.inserted_id),
    }


# ----------------------------------------------------
# LOGIN  (UPDATED WITH ADMIN RESTRICTION)
# ----------------------------------------------------
@auth_router.post("/login", response_model=TokenResponse)
def login(data: UserLogin):
    user = users_collection.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid credentials")

    # ADMIN CAN LOGIN ONLY USING FIXED EMAIL
    if user["role"].upper() == "ADMIN":
        if user["email"] != "admin@localpush.com":
            raise HTTPException(
                status_code=401,
                detail="Unauthorized admin login"
            )

    # verify password
    if not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    token = create_access_token({
        "id": str(user["_id"]),
        "role": user["role"],
    })

    return {"access_token": token, "token_type": "bearer"}


# ----------------------------------------------------
# GET LOGGED-IN USER
# ----------------------------------------------------
@auth_router.get("/me")
def get_me(token: str = Depends(oauth2_scheme)):
    try:
        decoded = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGO]
        )

        user_id = decoded.get("id")
        user = users_collection.find_one({"_id": ObjectId(user_id)})

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

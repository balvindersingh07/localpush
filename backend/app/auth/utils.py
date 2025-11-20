from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt, JWTError
from app.config import settings

# 🔥 Support BOTH bcrypt (old users) AND pbkdf2_sha256 (new users)
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256", "bcrypt"],
    deprecated="auto",
)


def hash_password(password: str):
    """
    Always hash NEW passwords using pbkdf2_sha256
    """
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str):
    """
    Supports verifying BOTH:
    - old bcrypt hashes
    - new pbkdf2_sha256 hashes
    """
    try:
        return pwd_context.verify(password, hashed)
    except Exception:
        return False


def create_access_token(data: dict, expires_minutes: int = 1440):
    payload = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    payload.update({"exp": expire})

    token = jwt.encode(
        payload,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGO
    )
    return token


def decode_token(token: str):
    try:
        decoded = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGO]
        )
        return decoded
    except JWTError:
        return None

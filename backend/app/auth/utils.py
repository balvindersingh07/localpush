from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt, JWTError
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str):
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str):
    return pwd_context.verify(password, hashed)


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
        decoded = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGO])
        return decoded
    except JWTError:
        return None

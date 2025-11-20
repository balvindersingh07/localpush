from pydantic_settings import BaseSettings, SettingsConfigDict
import cloudinary


class Settings(BaseSettings):
    # Your old variables
    MONGO_URI: str
    JWT_SECRET: str
    JWT_ALGO: str = "HS256"

    # ⭐ Cloudinary credentials
    CLOUDINARY_CLOUD_NAME: str = "dqku1n0xm"
    CLOUDINARY_API_KEY: str = "597254615115798"
    CLOUDINARY_API_SECRET: str = "5CQUtKd9HnRrZ7A-9fngjZhtjMk"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8"
    )


settings = Settings()

# ⭐ Configure Cloudinary globally
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True
)

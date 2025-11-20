from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    MONGO_URI: str
    JWT_SECRET: str
    JWT_ALGO: str = "HS256"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8"
    )

settings = Settings()

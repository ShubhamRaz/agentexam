from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "AgentExam API"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    FRONTEND_URL: str = "http://localhost:5173"

    DATABASE_URL: str = "postgresql+asyncpg://agentexam:password@localhost:5432/agentexam"
    VECTOR_DATABASE_URL: str = ""
    STORAGE_URL: str = ""
    MAX_UPLOAD_SIZE_MB: int = 20
    STORAGE_TYPE: str = "local"
    STORAGE_PATH: str = "./storage/materials"
    JWT_SECRET_KEY: str = "supersecretkey_for_development_only_change_in_production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    AI_API_KEY: str = ""

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.FRONTEND_URL.split(",") if origin.strip()]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

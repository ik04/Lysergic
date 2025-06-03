from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Lysergic"
    
    # Database settings
    DATABASE_URL: Optional[str] = None
    
    # CORS Settings
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:8000"]
    
    # API Settings
    DEBUG: bool = False
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
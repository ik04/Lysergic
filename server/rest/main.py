from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from api.routes.v1.erowid import substances,experiences
from api.routes.v1 import base

app = FastAPI(
    title=settings.PROJECT_NAME,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(base.router, prefix=settings.API_V1_STR)
app.include_router(substances.router, prefix=settings.API_V1_STR)
app.include_router(experiences.router, prefix=settings.API_V1_STR)
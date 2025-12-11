from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from api.routes.v1.erowid import substances, experiences, information
from api.routes.v1 import base
from cache_fastapi.cacheMiddleware import CacheMiddleware
from cache_fastapi.Backends.redis_backend import RedisBackend

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CacheMiddleware,
    backend=RedisBackend(),
    cached_endpoints=[
        f"{settings.API_V1_STR}/erowid/experiences/categories",
        f"{settings.API_V1_STR}/erowid/experience",
        f"{settings.API_V1_STR}/erowid/user",
        f"{settings.API_V1_STR}/erowid/substances",
        f"{settings.API_V1_STR}/erowid/category/experiences",
        f"{settings.API_V1_STR}/erowid/information",
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(base.router, prefix=settings.API_V1_STR)
app.include_router(substances.router, prefix=settings.API_V1_STR)
app.include_router(experiences.router, prefix=settings.API_V1_STR)
app.include_router(information.router, prefix=settings.API_V1_STR)
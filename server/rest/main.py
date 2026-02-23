from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from prometheus_client import make_asgi_app, Counter, Histogram
import time
from core.config import settings
from api.routes.v1.erowid import substances, experiences, information
from api.routes.v1 import base
from cache_fastapi.cacheMiddleware import CacheMiddleware
from cache_fastapi.Backends.redis_backend import RedisBackend

app = FastAPI(title=settings.PROJECT_NAME)

# Prometheus metrics
request_count = Counter(
    "lysergic_http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"]
)
request_duration = Histogram(
    "lysergic_http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0)
)

# Middleware to track Prometheus metrics
@app.middleware("http")
async def prometheus_middleware(request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    
    # Extract endpoint name from path
    endpoint = request.url.path
    
    request_count.labels(
        method=request.method,
        endpoint=endpoint,
        status=response.status_code
    ).inc()
    
    request_duration.labels(
        method=request.method,
        endpoint=endpoint
    ).observe(duration)
    
    return response

app.add_middleware(
    CacheMiddleware,
    backend=RedisBackend(),
    cached_endpoints=[
        f"{settings.API_V1_STR}/erowid/experiences/categories",
        f"{settings.API_V1_STR}/erowid/experience",
        f"{settings.API_V1_STR}/erowid/user",
        f"{settings.API_V1_STR}/erowid/substances",
        # f"{settings.API_V1_STR}/erowid/category/experiences",
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

# Mount Prometheus metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)
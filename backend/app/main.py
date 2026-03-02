"""FastAPI application entry point.

Mounts all API routes and configures CORS for the React frontend.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import biometrics, chat, health, recommendations
from app.core.config import settings

app = FastAPI(
    title="Training Intelligence Agent",
    description=(
        "Agentic AI system for analyzing wearable biometric data and "
        "generating training recommendations using RAG over sports "
        "science research."
    ),
    version="0.2.0",
)

# ---------------------------------------------------------------------------
# CORS — origins are configured via the ALLOWED_ORIGINS env var.
# Set ALLOWED_ORIGINS=https://your-app.onrender.com in production.
# Defaults to localhost dev origins if the variable is not set.
# ---------------------------------------------------------------------------

_origins = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

app.include_router(health.router,          prefix="/api",                tags=["health"])
app.include_router(biometrics.router,      prefix="/api/biometrics",     tags=["biometrics"])
app.include_router(recommendations.router, prefix="/api/recommend",      tags=["recommend"])
app.include_router(chat.router,            prefix="/api/chat",           tags=["chat"])

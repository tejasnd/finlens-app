"""FinLens FastAPI application entry point.

Run locally:  uvicorn app.main:app --reload --port 8000
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import init_db
from .routers import categorize, gmail, health, rag


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(title="FinLens Backend", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health.router)
app.include_router(categorize.router)
app.include_router(rag.router)
app.include_router(gmail.router)


@app.get("/")
async def root() -> dict:
    return {"service": "finlens-backend", "docs": "/docs"}

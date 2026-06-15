"""Liveness and LLM-provider health endpoints."""
from fastapi import APIRouter

from ..llm import provider_health

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "finlens-backend"}


@router.get("/llm/health")
async def llm_health() -> dict:
    return await provider_health()

"""Server-side transaction categorization (moves the LLM call off the browser).

This is the backend home for the categorization that previously ran in the
client. The RAG-augmented version (retrieving the user's own past labels as
few-shot examples) lands in Phase 2; this endpoint is the plain LLM baseline.
"""
import json
import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..llm import LLMError, complete, complete_with

router = APIRouter(prefix="/api", tags=["categorize"])

DEFAULT_CATEGORIES = [
    "Food & Dining", "Groceries", "Shopping", "Travel", "Transport",
    "Entertainment", "Health & Medical", "Utilities", "Subscriptions",
    "Education", "Personal Care", "Home & Living", "Finance & Fees",
    "Insurance", "Gifts & Donations", "Other",
]


class CategorizeRequest(BaseModel):
    descriptions: list[str] = Field(..., min_length=1, max_length=200)
    categories: list[str] | None = None
    # Optional per-request override from the UI's AI picker. When provider is
    # set, the backend uses that provider/model/key instead of its default chain.
    provider: str | None = None
    model: str | None = None
    api_key: str | None = None


class CategorizeResponse(BaseModel):
    categories: dict[str, str]
    provider: str


def _build_prompt(descriptions: list[str], categories: list[str]) -> str:
    numbered = "\n".join(f"{i + 1}. {d}" for i, d in enumerate(descriptions))
    return (
        "You are a financial transaction categorizer. Assign each transaction "
        "to exactly one category.\n\n"
        f"Categories: {', '.join(categories)}\n\n"
        f"Transactions:\n{numbered}\n\n"
        'Rules: Use "Other" only if nothing fits. Respond with JSON only using '
        'the number as key: {"1": "Category", "2": "Category", ...}'
    )


def _parse_response(text: str, descriptions: list[str], categories: list[str]) -> dict[str, str]:
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        return {}
    try:
        parsed = json.loads(match.group(0))
    except json.JSONDecodeError:
        return {}
    valid = set(categories)
    result: dict[str, str] = {}
    for idx, cat in parsed.items():
        try:
            desc = descriptions[int(idx) - 1]
        except (ValueError, IndexError):
            continue
        result[desc] = cat if cat in valid else "Other"
    return result


@router.post("/categorize", response_model=CategorizeResponse)
async def categorize(req: CategorizeRequest) -> CategorizeResponse:
    categories = req.categories or DEFAULT_CATEGORIES
    # De-duplicate while preserving order so we don't pay for repeated merchants.
    unique = list(dict.fromkeys(req.descriptions))
    prompt = _build_prompt(unique, categories)
    try:
        if req.provider:
            out = await complete_with(req.provider, prompt, model=req.model, api_key=req.api_key)
        else:
            out = await complete(prompt)
    except LLMError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    mapping = _parse_response(out["text"], unique, categories)
    # Fill any the model skipped with "Other" so the response is total.
    for desc in unique:
        mapping.setdefault(desc, "Other")
    return CategorizeResponse(categories=mapping, provider=out["provider"])

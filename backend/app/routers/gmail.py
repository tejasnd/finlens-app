"""Gmail MCP credentials management endpoints."""
import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..gmail_client import GmailAuthError, authorize, search_bills

MCP_DIR = Path(__file__).resolve().parents[2] / "mcp_servers"
CREDS_PATH = MCP_DIR / "credentials.json"
TOKEN_PATH = MCP_DIR / "token.json"

router = APIRouter(prefix="/api/gmail", tags=["gmail"])


class CredentialsBody(BaseModel):
    credentials: dict


@router.get("/status")
async def gmail_status() -> dict:
    return {
        "hasCredentials": CREDS_PATH.exists(),
        "hasToken": TOKEN_PATH.exists(),
    }


@router.post("/credentials")
async def save_credentials(body: CredentialsBody) -> dict:
    creds = body.credentials
    # Validate it looks like a Google OAuth client JSON
    top = creds.get("installed") or creds.get("web")
    if not top or "client_id" not in top:
        raise HTTPException(
            status_code=422,
            detail="Invalid credentials JSON — expected a Google OAuth 'Desktop app' client file with an 'installed' key.",
        )
    MCP_DIR.mkdir(parents=True, exist_ok=True)
    CREDS_PATH.write_text(json.dumps(creds, indent=2))
    return {"saved": True}


@router.delete("/credentials")
async def delete_credentials() -> dict:
    deleted = []
    for p in (CREDS_PATH, TOKEN_PATH):
        if p.exists():
            p.unlink()
            deleted.append(p.name)
    return {"deleted": deleted}


# Sync def: the Google client is blocking, so FastAPI runs this in its threadpool.
@router.get("/bills")
def gmail_bills(max_results: int = 10, newer_than: str = "1y") -> dict:
    """Search the user's Gmail for recent credit-card statements/bills.

    `newer_than` is a window like '1m' / '30d' / '1y'. 409 means "not authorized
    yet" (actionable: run authorize_gmail.py); 502 is an upstream Gmail failure.
    """
    try:
        return {"bills": search_bills(max_results=max_results, newer_than=newer_than)}
    except GmailAuthError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 — surface a clean message to the UI
        raise HTTPException(status_code=502, detail=f"Gmail search failed: {exc}") from exc


# Sync def + blocking: opens a browser on the host and waits for Google consent.
@router.post("/authorize")
def gmail_authorize() -> dict:
    """Run the one-time loopback OAuth consent in a browser and cache the token.

    Replaces the manual ``authorize_gmail.py`` step. 409 means credentials.json
    hasn't been saved yet; 502 is a failure during the consent flow.
    """
    try:
        authorize()
        return {"authorized": True, "hasToken": TOKEN_PATH.exists()}
    except GmailAuthError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Authorization failed: {exc}") from exc

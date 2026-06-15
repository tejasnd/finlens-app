"""Read-only Gmail bill search for the FastAPI backend.

This reuses the cached loopback-OAuth token created by the MCP server's one-time
authorize step (``mcp_servers/token.json``). Unlike the MCP server it never
launches an interactive browser flow — if there's no valid token it raises
``GmailAuthError`` and the UI tells the user to run ``authorize_gmail.py`` once.
That keeps the web request non-blocking and the OAuth consent an explicit,
user-driven step.
"""
import base64
import sys
from pathlib import Path

MCP_DIR = Path(__file__).resolve().parents[1] / "mcp_servers"
CREDS_PATH = MCP_DIR / "credentials.json"
TOKEN_PATH = MCP_DIR / "token.json"
SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]

import re

# Gmail search that targets statement / bill-ready emails (mirrors the MCP server).
_BILL_TERMS = (
    '(subject:(statement OR "bill is ready" OR "payment due" OR "minimum payment") '
    'OR "statement balance" OR "minimum payment due")'
)
DEFAULT_NEWER_THAN = "1y"


def _query(newer_than: str = DEFAULT_NEWER_THAN) -> str:
    """Build the Gmail search string for a time window like '1m', '30d', '1y'.

    Falls back to the default window if the value isn't a simple <number><unit>,
    so a stray value can't inject extra Gmail operators.
    """
    nt = newer_than if re.fullmatch(r"\d+[dmy]", newer_than or "") else DEFAULT_NEWER_THAN
    return f"{_BILL_TERMS} newer_than:{nt}"


# Back-compat for the previous module-level constant.
DEFAULT_QUERY = _query()

# bill_parser lives alongside the MCP servers; reuse its pure heuristics rather
# than duplicating the statement-parsing regexes.
if str(MCP_DIR) not in sys.path:
    sys.path.insert(0, str(MCP_DIR))
import bill_parser  # noqa: E402


class GmailAuthError(Exception):
    """Raised when credentials/token are missing or can't be refreshed."""


def _service():
    """Build a Gmail client from the cached token. Never prompts interactively."""
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    if not CREDS_PATH.exists():
        raise GmailAuthError(
            "No credentials.json saved yet. Add a Google OAuth 'Desktop app' client first."
        )
    if not TOKEN_PATH.exists():
        raise GmailAuthError(
            "Gmail isn't authorized yet. Click 'Authorize with Google' in Sync & AI Settings."
        )
    creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)
    if not creds.valid:
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            TOKEN_PATH.write_text(creds.to_json())
        else:
            raise GmailAuthError(
                "Gmail token is invalid/expired. Re-authorize in Sync & AI Settings."
            )
    return build("gmail", "v1", credentials=creds)


def authorize() -> bool:
    """Run the one-time loopback OAuth consent and cache token.json.

    Opens a browser on the machine running the backend and blocks until the user
    approves (or an existing token can be silently refreshed). Returns True on
    success. Raises GmailAuthError if credentials.json hasn't been saved yet.
    """
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow

    if not CREDS_PATH.exists():
        raise GmailAuthError(
            "No credentials.json saved yet. Add a Google OAuth 'Desktop app' client first."
        )
    creds = None
    if TOKEN_PATH.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)
    if creds and creds.valid:
        return True
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
    else:
        flow = InstalledAppFlow.from_client_secrets_file(str(CREDS_PATH), SCOPES)
        creds = flow.run_local_server(port=0)  # loopback — no hosted redirect
    TOKEN_PATH.write_text(creds.to_json())
    return True


def _header(payload: dict, name: str) -> str:
    for h in payload.get("headers", []):
        if h.get("name", "").lower() == name.lower():
            return h.get("value", "")
    return ""


def _decode(data: str) -> str:
    return base64.urlsafe_b64decode(data.encode()).decode("utf-8", "replace")


def _body_text(payload: dict) -> str:
    """Depth-first walk for the first text/plain (falls back to text/html)."""
    if payload.get("mimeType") == "text/plain" and payload.get("body", {}).get("data"):
        return _decode(payload["body"]["data"])
    for part in payload.get("parts", []):
        text = _body_text(part)
        if text:
            return text
    if payload.get("mimeType") == "text/html" and payload.get("body", {}).get("data"):
        return _decode(payload["body"]["data"])
    return ""


def search_bills(
    query: str | None = None,
    max_results: int = 10,
    newer_than: str = DEFAULT_NEWER_THAN,
) -> list[dict]:
    """Search Gmail for statement / bill emails and parse their key figures.

    `newer_than` is a window like '1m' / '30d' / '1y'. Returns a list of dicts
    with id, sender, subject, date, snippet, likely_bill, and parsed
    {statement_balance, minimum_due, due_date}. Raises GmailAuthError if not
    authorized; other Google API errors propagate to the caller.
    """
    svc = _service()
    listing = (
        svc.users().messages()
        .list(userId="me", q=query or _query(newer_than), maxResults=max_results)
        .execute()
    )
    out: list[dict] = []
    for ref in listing.get("messages", []):
        msg = svc.users().messages().get(userId="me", id=ref["id"], format="full").execute()
        payload = msg["payload"]
        subject = _header(payload, "Subject")
        sender = _header(payload, "From")
        out.append({
            "id": ref["id"],
            "sender": sender,
            "subject": subject,
            "date": _header(payload, "Date"),
            "snippet": msg.get("snippet", ""),
            "likely_bill": bill_parser.looks_like_bill(subject, sender),
            "parsed": bill_parser.parse_statement(_body_text(payload)),
        })
    return out

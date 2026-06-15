"""gmail-bills-mcp — an MCP server that searches Gmail for credit-card bills.

Uses Google's installed-app (loopback) OAuth flow, so it runs fully locally with
no hosted backend: the first tool call opens a browser for consent and caches a
token in `token.json`. You must drop a Desktop-type OAuth client `credentials.json`
in this folder first — see mcp_servers/README.md.

Run standalone:  python backend/mcp_servers/gmail_bills_mcp.py
"""
import base64
from pathlib import Path

from mcp.server.fastmcp import FastMCP

import bill_parser

HERE = Path(__file__).resolve().parent
CREDS_PATH = HERE / "credentials.json"
TOKEN_PATH = HERE / "token.json"
SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]

# Gmail search that targets statement / bill-ready emails.
DEFAULT_QUERY = (
    '(subject:(statement OR "bill is ready" OR "payment due" OR "minimum payment") '
    'OR "statement balance" OR "minimum payment due") newer_than:1y'
)

mcp = FastMCP("gmail-bills")


def _service():
    """Build an authenticated Gmail client (loopback OAuth, cached token)."""
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build

    if not CREDS_PATH.exists():
        raise RuntimeError(
            "Missing credentials.json. Create a Google Cloud OAuth client of type "
            "'Desktop app', download it here as credentials.json. See mcp_servers/README.md."
        )
    creds = None
    if TOKEN_PATH.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDS_PATH), SCOPES)
            creds = flow.run_local_server(port=0)  # loopback — no hosted redirect
        TOKEN_PATH.write_text(creds.to_json())
    return build("gmail", "v1", credentials=creds)


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


@mcp.tool()
def search_bills(query: str = DEFAULT_QUERY, max_results: int = 10) -> list[dict]:
    """Search Gmail for credit-card statement / bill emails. Returns lightweight
    metadata (id, sender, subject, date, snippet, likely_bill) — call get_bill for
    the parsed figures."""
    try:
        svc = _service()
        listing = (
            svc.users().messages()
            .list(userId="me", q=query, maxResults=max_results)
            .execute()
        )
        out = []
        for ref in listing.get("messages", []):
            msg = (
                svc.users().messages()
                .get(userId="me", id=ref["id"], format="metadata",
                     metadataHeaders=["From", "Subject", "Date"])
                .execute()
            )
            subject = _header(msg["payload"], "Subject")
            sender = _header(msg["payload"], "From")
            out.append({
                "id": ref["id"],
                "sender": sender,
                "subject": subject,
                "date": _header(msg["payload"], "Date"),
                "snippet": msg.get("snippet", ""),
                "likely_bill": bill_parser.looks_like_bill(subject, sender),
            })
        return out
    except Exception as exc:  # noqa: BLE001 — surface a clean message to the agent
        return [{"error": str(exc)}]


@mcp.tool()
def get_bill(message_id: str) -> dict:
    """Fetch one email and parse its statement figures (balance, minimum due, due date)."""
    try:
        svc = _service()
        msg = svc.users().messages().get(userId="me", id=message_id, format="full").execute()
        payload = msg["payload"]
        return {
            "sender": _header(payload, "From"),
            "subject": _header(payload, "Subject"),
            "date": _header(payload, "Date"),
            "parsed": bill_parser.parse_statement(_body_text(payload)),
        }
    except Exception as exc:  # noqa: BLE001
        return {"error": str(exc)}


if __name__ == "__main__":
    mcp.run()  # stdio transport

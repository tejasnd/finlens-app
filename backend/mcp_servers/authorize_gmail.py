"""One-time Gmail OAuth consent helper.

Run this once to open a browser for Google consent and cache token.json.
After that, the gmail-bills-mcp server and agent_host.py work without prompts.

Usage:
    cd backend && python mcp_servers/authorize_gmail.py
"""
from pathlib import Path

HERE = Path(__file__).resolve().parent
CREDS_PATH = HERE / "credentials.json"
TOKEN_PATH = HERE / "token.json"
SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]


def main():
    if not CREDS_PATH.exists():
        print("ERROR: credentials.json not found.")
        print("Save your Google OAuth Desktop-app JSON to:", CREDS_PATH)
        return

    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow

    creds = None
    if TOKEN_PATH.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)

    if creds and creds.valid:
        print("Already authorized — token.json is valid. Nothing to do.")
        return

    if creds and creds.expired and creds.refresh_token:
        print("Refreshing expired token...")
        creds.refresh(Request())
    else:
        print("Opening browser for Google consent...")
        flow = InstalledAppFlow.from_client_secrets_file(str(CREDS_PATH), SCOPES)
        creds = flow.run_local_server(port=0)

    TOKEN_PATH.write_text(creds.to_json())
    print("Done — token.json saved. Gmail MCP is ready.")


if __name__ == "__main__":
    main()

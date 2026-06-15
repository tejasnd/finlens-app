# FinLens MCP Servers

Model Context Protocol servers that expose FinLens data and capabilities as
tools an LLM agent can call. They run locally over **stdio** and read the same
`backend/finlens.db` the web app populates.

## `finlens_mcp.py` — financial data tools

| Kind | Name | Purpose |
|---|---|---|
| tool | `get_spend_by_category(month?)` | Total spend per category, optionally for one `YYYY-MM` |
| tool | `find_transactions(category?, owner?, month?, limit?)` | Search transactions |
| tool | `get_top_merchants(limit?)` | Highest-spend merchants |
| tool | `get_settlement(split_first_pct?)` | Who owes whom for shared expenses |
| resource | `finlens://overview` | JSON snapshot: totals, date range, per-category spend |

Data logic lives in `finance_queries.py` (no MCP dependency) so it's unit-testable
and reused by the agent host.

## Run standalone (stdio)

```bash
cd backend && source .venv/bin/activate
python mcp_servers/finlens_mcp.py
```

## Use from Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`, then
restart Claude Desktop. Use absolute paths:

```json
{
  "mcpServers": {
    "finlens": {
      "command": "/Users/tejasdighe/Desktop/Personal project/finlens-app/backend/.venv/bin/python",
      "args": ["/Users/tejasdighe/Desktop/Personal project/finlens-app/backend/mcp_servers/finlens_mcp.py"]
    }
  }
}
```

Then ask Claude things like *"What did we spend the most on?"* or *"Are we settled
up?"* and it will call these tools.

## `gmail_bills_mcp.py` — Gmail credit-card bill ingestion

| Kind | Name | Purpose |
|---|---|---|
| tool | `search_bills(query?, max_results?)` | Search Gmail for statement / bill emails |
| tool | `get_bill(message_id)` | Fetch one email and parse balance, minimum due, due date |

Statement parsing lives in `bill_parser.py` (pure, unit-tested). Auth uses
Google's **installed-app loopback flow** — fully local, no hosted redirect, token
cached in `token.json`.

### One-time Google setup

1. Go to [Google Cloud Console](https://console.cloud.google.com) → create/select a project.
2. **APIs & Services → Library →** enable **Gmail API**.
3. **APIs & Services → OAuth consent screen →** External, add yourself as a test user.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID →**
   application type **Desktop app**.
5. Download the JSON and save it as `backend/mcp_servers/credentials.json`.

The first `search_bills` / `get_bill` call opens a browser for consent; after that
the cached token is reused. Scope is read-only (`gmail.readonly`).
`credentials.json` and `token.json` are git-ignored.

## Use both servers from Claude Desktop

```json
{
  "mcpServers": {
    "finlens": {
      "command": "/Users/tejasdighe/Desktop/Personal project/finlens-app/backend/.venv/bin/python",
      "args": ["/Users/tejasdighe/Desktop/Personal project/finlens-app/backend/mcp_servers/finlens_mcp.py"]
    },
    "gmail-bills": {
      "command": "/Users/tejasdighe/Desktop/Personal project/finlens-app/backend/.venv/bin/python",
      "args": ["/Users/tejasdighe/Desktop/Personal project/finlens-app/backend/mcp_servers/gmail_bills_mcp.py"]
    }
  }
}
```

## `agent_host.py` — compose both servers with an LLM

A custom MCP **client/host** that connects to both servers, advertises their tools
to the LLM, and runs a tool-calling loop so the agent can, e.g., pull a bill from
Gmail and reconcile it against tracked spend. See "Run the agent" below.

```bash
cd backend && source .venv/bin/activate
python mcp_servers/agent_host.py "Find my latest credit card bill and compare it to what we spent."
```

"""finlens-mcp — an MCP server exposing the couple's financial data as tools.

Run standalone over stdio:
    python backend/mcp_servers/finlens_mcp.py

Or register it with Claude Desktop / an agent host (see mcp_servers/README.md).
Tools are thin wrappers over `finance_queries` so the data logic stays testable.
"""
import json

from mcp.server.fastmcp import FastMCP

import finance_queries as fq

mcp = FastMCP("finlens")


@mcp.tool()
def get_spend_by_category(month: str | None = None) -> dict:
    """Total spend per category. Pass `month` as 'YYYY-MM' to filter to one month."""
    return fq.sum_by_category(month)


@mcp.tool()
def find_transactions(
    category: str | None = None,
    owner: str | None = None,
    month: str | None = None,
    limit: int = 50,
) -> list[dict]:
    """Search transactions by category, owner, and/or month ('YYYY-MM')."""
    return fq.query_transactions(category, owner, month, limit)


@mcp.tool()
def get_top_merchants(limit: int = 10) -> list[dict]:
    """The highest-spend merchants by total amount."""
    return fq.top_merchants(limit)


@mcp.tool()
def get_settlement(split_first_pct: float = 50.0) -> dict:
    """Who owes whom for shared expenses, given the first person's split percentage."""
    return fq.settlement(split_first_pct)


@mcp.resource("finlens://overview")
def overview_resource() -> str:
    """A JSON snapshot: totals, date range, and per-category spend."""
    return json.dumps(fq.overview(), indent=2)


if __name__ == "__main__":
    mcp.run()  # stdio transport

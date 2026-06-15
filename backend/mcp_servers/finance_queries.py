"""Plain data-access functions over the FinLens SQLite DB.

Kept free of any MCP dependency so they can be unit-tested directly and reused
by both the MCP server and an agent host. The table name `transaction` is a SQL
keyword, hence the quoting throughout.
"""
import re
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "finlens.db"

_MONTH_RE = re.compile(r"^\d{4}-\d{2}$")


def _valid_month(month: str | None) -> str | None:
    """Ignore non-'YYYY-MM' values (small models sometimes pass placeholders)."""
    return month if month and _MONTH_RE.match(month) else None

# Credit-card payments aren't spending; exclude them from spend rollups
# (mirrors the React app's `spendOnly` semantics).
_SPEND_FILTER = 'amount > 0 AND category != "Finance & Fees"'


def _conn() -> sqlite3.Connection:
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


def sum_by_category(month: str | None = None) -> dict[str, float]:
    """Total spend per category. `month` filters to 'YYYY-MM' when given."""
    q = f'SELECT category, SUM(amount) t FROM "transaction" WHERE {_SPEND_FILTER}'
    params: list = []
    month = _valid_month(month)
    if month:
        q += " AND substr(date,1,7) = ?"
        params.append(month)
    q += " GROUP BY category ORDER BY t DESC"
    with _conn() as con:
        return {r["category"]: round(r["t"], 2) for r in con.execute(q, params)}


def query_transactions(
    category: str | None = None,
    owner: str | None = None,
    month: str | None = None,
    limit: int = 50,
) -> list[dict]:
    """Return matching transactions (newest first)."""
    clauses, params = [], []
    if category:
        clauses.append("category = ?"); params.append(category)
    if owner:
        clauses.append("owner = ?"); params.append(owner)
    month = _valid_month(month)
    if month:
        clauses.append("substr(date,1,7) = ?"); params.append(month)
    where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
    q = (
        'SELECT date, amount, category, owner, description '
        f'FROM "transaction"{where} ORDER BY date DESC LIMIT ?'
    )
    params.append(limit)
    with _conn() as con:
        return [dict(r) for r in con.execute(q, params)]


def top_merchants(limit: int = 10) -> list[dict]:
    """Highest-spend merchants by total amount."""
    q = (
        'SELECT description, SUM(amount) total, COUNT(*) count '
        f'FROM "transaction" WHERE {_SPEND_FILTER} '
        "GROUP BY description ORDER BY total DESC LIMIT ?"
    )
    with _conn() as con:
        return [
            {"merchant": r["description"], "total": round(r["total"], 2), "count": r["count"]}
            for r in con.execute(q, (limit,))
        ]


def settlement(split_first_pct: float = 50.0) -> dict:
    """Who owes whom for shared expenses, given the first person's split %.

    Mirrors the app's settlement: personal expenses stay with their owner;
    shared expenses are split `split_first_pct` / `100 - split_first_pct`.
    """
    with _conn() as con:
        rows = con.execute(
            'SELECT owner, amount, split_type FROM "transaction"'
        ).fetchall()
    owners = sorted({r["owner"] for r in rows if r["owner"]})
    if len(owners) < 2:
        return {"error": "Need exactly two people to settle.", "owners": owners}
    a, b = owners[0], owners[1]
    pa, pb = split_first_pct / 100, 1 - split_first_pct / 100
    a_owes = b_owes = 0.0
    for r in rows:
        if r["split_type"] == "personal":
            continue
        if r["owner"] == a:
            b_owes += r["amount"] * pb
        elif r["owner"] == b:
            a_owes += r["amount"] * pa
    net = round(a_owes - b_owes, 2)
    if net > 0.005:
        msg = f"{a} owes {b} ${net:.2f}"
    elif net < -0.005:
        msg = f"{b} owes {a} ${abs(net):.2f}"
    else:
        msg = "All settled up."
    return {"personA": a, "personB": b, "net": net, "summary": msg}


def overview() -> dict:
    """High-level snapshot for an at-a-glance resource."""
    with _conn() as con:
        n = con.execute('SELECT COUNT(*) c FROM "transaction"').fetchone()["c"]
        total = con.execute(
            f'SELECT COALESCE(SUM(amount),0) t FROM "transaction" WHERE {_SPEND_FILTER}'
        ).fetchone()["t"]
        span = con.execute(
            'SELECT MIN(substr(date,1,10)) lo, MAX(substr(date,1,10)) hi FROM "transaction"'
        ).fetchone()
    return {
        "transactions": n,
        "total_spend": round(total, 2),
        "date_range": [span["lo"], span["hi"]],
        "by_category": sum_by_category(),
    }

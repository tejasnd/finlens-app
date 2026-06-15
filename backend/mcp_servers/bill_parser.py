"""Pure functions for extracting structured data from credit-card statement
emails. No Gmail / MCP dependency, so they're directly unit-testable.
"""
import re

# A money amount like $1,234.56 (group captures the numeric part).
_MONEY = r"\$?\s*([0-9][0-9,]*\.[0-9]{2})"
# A date like "January 5, 2026", "Jan 5 2026", or "01/05/2026".
_DATE = (
    r"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}"
    r"|\d{1,2}/\d{1,2}/\d{2,4})"
)


def _amount_for(text: str, label: str) -> float | None:
    """First money amount appearing within ~60 chars after `label`."""
    m = re.search(label + r"[:\s]{0,60}?" + _MONEY, text, re.IGNORECASE)
    if not m:
        return None
    return float(m.group(1).replace(",", ""))


def _date_for(text: str, label: str) -> str | None:
    m = re.search(label + r"[:\s]{0,60}?" + _DATE, text, re.IGNORECASE)
    return m.group(1).strip() if m else None


def parse_statement(text: str) -> dict:
    """Extract the figures that matter from a statement email body."""
    return {
        "statement_balance": _amount_for(text, r"(?:new balance|statement balance|total balance)"),
        "minimum_due": _amount_for(text, r"(?:minimum payment due|minimum amount due|minimum payment)"),
        "due_date": _date_for(text, r"(?:payment due date|due date|autopay)"),
    }


def looks_like_bill(subject: str, sender: str) -> bool:
    """Cheap heuristic to flag statement / bill emails from a list result."""
    hay = f"{subject} {sender}".lower()
    keywords = ("statement", "bill is ready", "payment due", "your bill", "minimum payment", "e-statement")
    return any(k in hay for k in keywords)

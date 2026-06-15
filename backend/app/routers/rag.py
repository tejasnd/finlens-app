"""RAG endpoints: index the couple's transactions and answer NL questions.

The query path is a hybrid: semantic **retrieval** of the most relevant
transactions (the RAG core) is combined with exact **category aggregates**
computed in Python. Pure vector RAG is weak at "how much did we spend on X"
(retrieving k rows can't sum hundreds), so the aggregates keep the dollar
figures correct while retrieval supplies the relevant detail and context.
"""
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from ..db import get_session
from ..llm import LLMError, complete
from ..models import Transaction
from ..rag import index

router = APIRouter(prefix="/api", tags=["rag"])


class TxIn(BaseModel):
    id: str
    owner: str = ""
    date: str = ""
    amount: float = 0.0
    description: str = ""
    category: str = "Other"
    splitType: str = "personal"
    source: str = ""


class IndexRequest(BaseModel):
    transactions: list[TxIn] = Field(..., min_length=1)


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1)
    k: int = 20


def _doc(t: Transaction) -> str:
    """Text representation embedded for retrieval."""
    month = t.date[:7] if t.date else ""
    return f"{t.description} | {t.category} | {t.owner} | {month} | ${t.amount:.2f}"


def _rebuild(session: Session) -> int:
    rows = session.exec(select(Transaction)).all()
    index.build([r.id for r in rows], [_doc(r) for r in rows])
    return len(rows)


@router.post("/index")
def index_transactions(req: IndexRequest, session: Session = Depends(get_session)) -> dict:
    incoming_ids = {t.id for t in req.transactions}
    for t in req.transactions:
        obj = session.get(Transaction, t.id) or Transaction(id=t.id)
        obj.owner, obj.date, obj.amount = t.owner, t.date, t.amount
        obj.description, obj.category = t.description, t.category
        obj.split_type, obj.source = t.splitType, t.source
        session.add(obj)
    # Mirror the client dataset exactly: prune rows the client no longer has, so
    # transactions deleted in the UI stop appearing in retrieval/aggregates.
    for row in session.exec(select(Transaction)).all():
        if row.id not in incoming_ids:
            session.delete(row)
    session.commit()
    return {"indexed": _rebuild(session)}


@router.delete("/transactions")
def clear_transactions(session: Session = Depends(get_session)) -> dict:
    """Wipe all indexed transactions and reset the in-memory vector index.

    Backs the UI's "Clear all data" action so the local RAG store doesn't keep
    answering from data the user has deleted.
    """
    rows = session.exec(select(Transaction)).all()
    for row in rows:
        session.delete(row)
    session.commit()
    index.build([], [])
    return {"cleared": len(rows)}


def _aggregates(rows: list[Transaction]) -> str:
    """Exact spend totals by category (positive amounts, excluding card payments)."""
    totals: dict[str, float] = defaultdict(float)
    for r in rows:
        if r.amount > 0 and r.category != "Finance & Fees":
            totals[r.category] += r.amount
    lines = [
        f"  {cat}: ${amt:,.2f}"
        for cat, amt in sorted(totals.items(), key=lambda kv: -kv[1])
    ]
    grand = sum(totals.values())
    return f"Total spend: ${grand:,.2f}\n" + "\n".join(lines)


def _build_prompt(question: str, retrieved: list[Transaction], all_rows: list[Transaction]) -> str:
    rows_txt = "\n".join(
        f"  {r.date[:10]}  ${r.amount:>9.2f}  {r.category:<18}  {r.owner:<10}  {r.description}"
        for r in retrieved
    ) or "  (no matching transactions)"
    dates = sorted(r.date[:10] for r in all_rows if r.date)
    span = f"{dates[0]} to {dates[-1]}" if dates else "n/a"
    return (
        "You are FinLens, a finance assistant for a couple. Answer the question "
        "using ONLY the data below. Be concise; give exact dollar figures and name "
        "the people/categories involved. If the data is insufficient, say so.\n\n"
        f"Question: {question}\n\n"
        f"Most relevant transactions (semantically retrieved):\n{rows_txt}\n\n"
        f"Exact category totals across all {len(all_rows)} transactions "
        f"({span}):\n{_aggregates(all_rows)}\n\n"
        "Answer:"
    )


@router.post("/query")
async def query(req: QueryRequest, session: Session = Depends(get_session)) -> dict:
    if index.is_empty():
        _rebuild(session)
    hits = index.search(req.question, k=req.k)
    by_id = {r.id: r for r in session.exec(select(Transaction)).all()}
    if not by_id:
        raise HTTPException(status_code=400, detail="No transactions indexed yet. POST /api/index first.")
    retrieved = [by_id[i] for i, _ in hits if i in by_id]

    try:
        out = await complete(_build_prompt(req.question, retrieved, list(by_id.values())))
    except LLMError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {
        "answer": out["text"],
        "provider": out["provider"],
        "retrieved": [
            {"date": r.date[:10], "amount": r.amount, "category": r.category,
             "owner": r.owner, "description": r.description}
            for r in retrieved[:10]
        ],
    }

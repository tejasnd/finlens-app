# FinLens

[![CI](https://github.com/tejasnd/finlens-app/actions/workflows/ci.yml/badge.svg)](https://github.com/tejasnd/finlens-app/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/tejasnd/finlens-app)](https://github.com/tejasnd/finlens-app/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

FinLens is a **privacy-first, local-first couple budgeting app**. Import bank transactions, track shared spending and settlements, and **ask questions about your finances in plain English** — powered by a local Retrieval-Augmented Generation (RAG) pipeline and a set of Model Context Protocol (MCP) servers an LLM agent can drive. Everything runs on your own machine: the React app, a FastAPI backend, on-device embeddings, and an LLM that defaults to a local Ollama model.

---

## Architecture

```
┌──────────────────────────────┐
│  React SPA  (Vite)           │   ← couple budgeting UI + "Ask FinLens" tab
│  proxies /api/* ───────────► │
└───────────────┬──────────────┘
                │ HTTP (localhost)
┌───────────────▼──────────────────────────────────────────┐
│  FastAPI backend                                          │
│   • LLM client: Ollama (local) → cloud key (fallback)     │
│   • RAG: SQLite + on-device embeddings (sentence-transf.) │
│     /api/index  → embed + index transactions              │
│     /api/query  → retrieve + augment + generate (NL Q&A)  │
│   • /api/categorize (server-side LLM categorization)      │
└───────────────┬───────────────────────────────────────────┘
                │ reads finlens.db
┌───────────────▼──────────────────────────────────────────┐
│  MCP layer (Python MCP SDK, stdio)                        │
│   • finlens-mcp      → finance tools (spend, settlement…) │
│   • gmail-bills-mcp  → search Gmail for bills (loopback   │
│                        OAuth, fully local)                │
│   • agent_host.py    → custom MCP *host* composing both,  │
│                        driving them with the LLM          │
└───────────────────────────────────────────────────────────┘
```

---

## Features

- **CSV / Excel Upload** — Import transactions from any bank export
- **Couple / Split Tracking** — Assign transactions to each partner, split shared costs, and see who owes whom
- **Ask FinLens (RAG)** — Natural-language questions over your data (*"how much did we spend on dining last month?"*) answered by a local retrieve → augment → generate pipeline
- **AI Categorization** — Server-side LLM categorization (local Ollama by default), run on import or re-run any time on transactions still in "Other"
- **Gmail bill search (in-app)** — After a one-time local OAuth, search your inbox for credit-card statements from **Sync & AI Settings**; FinLens lists each bill with its parsed balance, minimum due, and due date
- **MCP servers + agent** — The same finance + Gmail tools are also exposed over Model Context Protocol, so an LLM agent (or Claude Desktop) can drive them and reconcile bills
- **Budget & Subscription Tracking** — Per-category budgets and recurring-charge detection
- **Clear all data** — One click wipes local transactions, budgets, rules, and the category cache, and clears the backend RAG index
- **Excel Export** and **GitHub Sync** for backup

---

## How the AI works

### RAG — natural-language querying ([backend/app/rag.py](backend/app/rag.py), [routers/rag.py](backend/app/routers/rag.py))
1. Transactions are embedded **on-device** with `all-MiniLM-L6-v2` (sentence-transformers) — no embedding API, so data never leaves the machine.
2. A query is embedded and matched by cosine similarity against an in-memory index (brute-force; for a few thousand rows it's sub-millisecond, so no vector DB is warranted).
3. The top-k transactions are injected into the prompt, **plus exact category aggregates** computed in SQL. This hybrid keeps dollar figures correct — pure vector RAG can't sum hundreds of rows — while retrieval supplies the relevant detail.
4. A local (or cloud-fallback) LLM generates the answer.

### MCP — tools an agent can drive ([backend/mcp_servers/](backend/mcp_servers/))
- **`finlens-mcp`** exposes finance **tools** (`get_spend_by_category`, `find_transactions`, `get_top_merchants`, `get_settlement`) and a `finlens://overview` **resource**.
- **`gmail-bills-mcp`** exposes `search_bills` / `get_bill`, using Google's installed-app **loopback OAuth** — local, read-only, no hosted backend.
- **`agent_host.py`** is a custom MCP **host/client** that connects to both servers, advertises their tools to the LLM, and runs a tool-calling loop. Demo it directly or point **Claude Desktop** at the servers (config in [mcp_servers/README.md](backend/mcp_servers/README.md)).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Recharts |
| Backend | FastAPI, SQLite (SQLModel) |
| RAG | sentence-transformers (local embeddings), NumPy |
| LLM | Ollama (local default) → Claude / OpenAI (fallback) |
| Agent tooling | Model Context Protocol (Python SDK) |
| Testing | Vitest (frontend), 161 tests |

---

## Getting Started

Everything runs locally. You need **Node 18+**, **Python 3.11+**, and **[Ollama](https://ollama.com)**.

### 1. Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
ollama pull llama3.2:3b            # local LLM (default)
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend

```bash
npm install
npm run dev                         # http://localhost:5173 (proxies /api → :8000)
```

### 3. MCP agent (optional)

```bash
cd backend && source .venv/bin/activate
python mcp_servers/agent_host.py "What did we spend the most on, and are we settled up?"
```

See [backend/mcp_servers/README.md](backend/mcp_servers/README.md) for the Gmail OAuth setup and Claude Desktop config.

---

## Privacy

**Your financial data stays on your machine.** The React app stores data in `localStorage`; the FastAPI backend stores it in a local SQLite file; embeddings are computed on-device; and the LLM defaults to a **local** Ollama model. If you opt into a cloud LLM fallback, only the relevant prompt (not your whole dataset) is sent, using **your own** API key. The Gmail integration uses a read-only, local loopback OAuth flow — the token never leaves your machine.

---

## Known Limitations

- **Local model accuracy** — The default `llama3.2:3b` is fast but small; for sharper answers/tool-use set `OLLAMA_MODEL=llama3.1` or configure a cloud fallback key in `backend/.env`.
- **RAG aggregation** — Semantic retrieval is paired with SQL aggregates for totals; very open-ended analytical questions may still need the MCP tools for exact math.
- **Gmail OAuth** — Requires a one-time Google Cloud "Desktop app" OAuth client (free). Authorize from the app (**Sync & AI Settings → Authorize with Google**); after that the in-app bill search uses the cached token. See the MCP README.
- **No mobile layout** — Designed for desktop browsers.

---

## Performance

The Transactions tab paginates at 100 rows per page (`TX_PER_PAGE`), so the rendered DOM stays bounded regardless of dataset size. Search is debounced 150 ms; tab components are wrapped in `React.memo`. Derived-data memos recompute in single-digit milliseconds up to ~5,000 transactions (measured in jsdom; a real browser is 2–5× faster).

---

## Contributing

Pull requests welcome. For major changes, open an issue first.

## License

MIT — see [LICENSE](LICENSE).

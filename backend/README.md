# FinLens Backend (FastAPI)

Local LLM/RAG/MCP backend for FinLens. Runs entirely on your machine — no
external hosting required. The LLM defaults to a local **Ollama** model and
falls back to a cloud API only if you configure a key.

## Prerequisites

- Python 3.11+
- [Ollama](https://ollama.com) (for local LLM inference)

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # adjust if needed

# Local model (default provider):
ollama pull llama3.2:3b      # or llama3.1 for sharper answers / tool use
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

- API docs (Swagger): http://localhost:8000/docs
- Health: http://localhost:8000/api/health
- LLM provider status: http://localhost:8000/api/llm/health

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness check |
| GET | `/api/llm/health` | Which LLM providers are reachable |
| POST | `/api/categorize` | Categorize transaction descriptions via the LLM |
| POST | `/api/index` | Embed + index transactions for RAG (called by the Ask tab) |
| POST | `/api/query` | Natural-language question → retrieve + augment + generate |

### Examples

```bash
curl -s http://localhost:8000/api/categorize \
  -H 'content-type: application/json' \
  -d '{"descriptions":["WHOLEFDS MKT 123","UBER TRIP","NETFLIX.COM"]}' | jq

curl -s http://localhost:8000/api/query \
  -H 'content-type: application/json' \
  -d '{"question":"How much did we spend on dining?"}' | jq
```

## LLM routing

`LLM_PRIMARY` is tried first; `LLM_FALLBACK` runs only if the primary fails.
Set `LLM_FALLBACK=` (blank) to stay fully offline. See `.env.example`.

## RAG

`/api/index` stores transactions in SQLite and embeds them on-device with
sentence-transformers; `/api/query` retrieves the most similar transactions,
adds exact SQL category aggregates, and asks the LLM to answer. See
[app/rag.py](app/rag.py) and [app/routers/rag.py](app/routers/rag.py).

## MCP servers + agent

The Model Context Protocol servers and the agent host live in
[mcp_servers/](mcp_servers/) — see [mcp_servers/README.md](mcp_servers/README.md)
for tools, the Gmail OAuth setup, the Claude Desktop config, and how to run the
agent.

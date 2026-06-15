"""agent_host.py — a custom MCP host that composes the FinLens MCP servers.

Spawns finlens-mcp and gmail-bills-mcp over stdio, advertises their tools to a
local LLM (Ollama), and runs a tool-calling loop so the agent can answer questions
that span both — e.g. pull a bill from Gmail and reconcile it against tracked
spend. This is the MCP *client/host* side (the servers are the providers).

Usage:
    python mcp_servers/agent_host.py "Are we settled up, and what did we spend most on?"
"""
import asyncio
import json
import os
import sys
from contextlib import AsyncExitStack
from pathlib import Path

import httpx
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

HERE = Path(__file__).resolve().parent
PY = sys.executable
OLLAMA = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2:3b")
MAX_ROUNDS = 6

SERVERS = ["finlens_mcp.py", "gmail_bills_mcp.py"]

SYSTEM = (
    "You are FinLens, a finance assistant for a couple. Use the provided tools to "
    "answer questions about their spending and bills. Prefer exact figures from "
    "tools over guessing. Omit optional parameters unless you have a concrete value — "
    "never pass placeholders like 'YYYY-MM'. Be concise."
)


async def _connect(stack: AsyncExitStack, script: str) -> ClientSession:
    # Absolute path: a relative arg + cwd is unreliable and silently kills the
    # server subprocess (the client then hangs waiting for a handshake).
    params = StdioServerParameters(command=PY, args=[str(HERE / script)], cwd=str(HERE))
    read, write = await stack.enter_async_context(stdio_client(params))
    session = await stack.enter_async_context(ClientSession(read, write))
    await session.initialize()
    return session


async def run(question: str) -> str:
    async with AsyncExitStack() as stack:
        route: dict[str, ClientSession] = {}          # tool name -> owning session
        llm_tools: list[dict] = []
        for script in SERVERS:
            session = await _connect(stack, script)
            for tool in (await session.list_tools()).tools:
                route[tool.name] = session
                llm_tools.append({
                    "type": "function",
                    "function": {
                        "name": tool.name,
                        "description": tool.description or "",
                        "parameters": tool.inputSchema or {"type": "object", "properties": {}},
                    },
                })

        messages = [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": question},
        ]

        async with httpx.AsyncClient(timeout=180) as client:
            for _ in range(MAX_ROUNDS):
                resp = await client.post(
                    f"{OLLAMA}/api/chat",
                    json={"model": MODEL, "messages": messages, "tools": llm_tools, "stream": False},
                )
                resp.raise_for_status()
                msg = resp.json()["message"]
                messages.append(msg)

                calls = msg.get("tool_calls")
                if not calls:
                    return msg.get("content", "").strip()

                for call in calls:
                    fn = call["function"]["name"]
                    args = call["function"].get("arguments", {})
                    if isinstance(args, str):
                        args = json.loads(args or "{}")
                    session = route.get(fn)
                    if session is None:
                        result = f"Unknown tool: {fn}"
                    else:
                        out = await session.call_tool(fn, args)
                        result = out.content[0].text if out.content else ""
                    print(f"  · called {fn}({args}) -> {result[:80]}", file=sys.stderr)
                    messages.append({"role": "tool", "content": result})

        return "(stopped after max tool-calling rounds)"


if __name__ == "__main__":
    q = " ".join(sys.argv[1:]) or "What did we spend the most on, and are we settled up?"
    print(asyncio.run(run(q)))

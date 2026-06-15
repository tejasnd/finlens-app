"""LLM client abstraction.

A single `complete(prompt)` entry point routes to the configured primary
provider (local Ollama by default) and transparently falls back to a cloud
provider if the primary is unavailable. Each provider uses its own default
model so the chain works without the caller knowing which one ran.
"""
import httpx

from .config import settings


class LLMError(Exception):
    def __init__(self, message: str, code: str = "LLM_ERROR"):
        super().__init__(message)
        self.code = code


# Each provider takes optional `model` / `api_key` overrides so a single request
# (e.g. the user's picker in the UI) can choose the provider, model, and key.
async def _ollama_complete(prompt: str, timeout: float, model: str | None = None,
                           api_key: str | None = None) -> str:
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(
            f"{settings.ollama_base_url}/api/generate",
            json={"model": model or settings.ollama_model, "prompt": prompt, "stream": False},
        )
        r.raise_for_status()
        return r.json().get("response", "")


async def _claude_complete(prompt: str, timeout: float, model: str | None = None,
                           api_key: str | None = None) -> str:
    key = api_key or settings.anthropic_api_key
    if not key:
        raise LLMError("No Anthropic API key configured.", "NO_KEY")
    m = model or settings.anthropic_model
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": m,
                "max_tokens": 1024,
                "messages": [{"role": "user", "content": prompt}],
            },
        )
        r.raise_for_status()
        return r.json()["content"][0]["text"]


async def _openai_complete(prompt: str, timeout: float, model: str | None = None,
                           api_key: str | None = None) -> str:
    key = api_key or settings.openai_api_key
    if not key:
        raise LLMError("No OpenAI API key configured.", "NO_KEY")
    m = model or settings.openai_model
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}"},
            json={
                "model": m,
                "max_tokens": 1024,
                "messages": [{"role": "user", "content": prompt}],
            },
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]


async def _gemini_complete(prompt: str, timeout: float, model: str | None = None,
                           api_key: str | None = None) -> str:
    key = api_key or settings.gemini_api_key
    if not key:
        raise LLMError("No Gemini API key configured.", "NO_KEY")
    m = model or settings.gemini_model
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={key}",
            json={"contents": [{"parts": [{"text": prompt}]}]},
        )
        r.raise_for_status()
        return r.json()["candidates"][0]["content"]["parts"][0]["text"]


_PROVIDERS = {
    "ollama": _ollama_complete,
    "claude": _claude_complete,
    "openai": _openai_complete,
    "gemini": _gemini_complete,
}


async def complete_with(provider: str, prompt: str, model: str | None = None,
                        api_key: str | None = None) -> dict:
    """Run the prompt through one explicit provider (used when the UI picks it)."""
    fn = _PROVIDERS.get(provider)
    if fn is None:
        raise LLMError(f"Unknown provider: {provider}", "UNKNOWN_PROVIDER")
    text = await fn(prompt, settings.request_timeout, model=model, api_key=api_key)
    return {"text": text, "provider": provider}


def _provider_chain() -> list[str]:
    """Ordered, de-duplicated list of providers to try."""
    chain = [settings.llm_primary]
    if settings.llm_fallback and settings.llm_fallback != settings.llm_primary:
        chain.append(settings.llm_fallback)
    return [p for p in chain if p in _PROVIDERS]


async def complete(prompt: str) -> dict:
    """Run the prompt through the primary provider, falling back on failure.

    Returns {"text": str, "provider": str}. Raises LLMError if all fail.
    """
    last_error: Exception | None = None
    for name in _provider_chain():
        try:
            text = await _PROVIDERS[name](prompt, settings.request_timeout)
            return {"text": text, "provider": name}
        except Exception as exc:  # noqa: BLE001 — try the next provider
            last_error = exc
    raise LLMError(
        f"All LLM providers failed ({', '.join(_provider_chain())}): {last_error}",
        "ALL_FAILED",
    )


async def provider_health() -> dict:
    """Report which configured providers are reachable. Used by /api/llm/health."""
    status = {}
    # Ollama: cheap liveness check against its root endpoint.
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(f"{settings.ollama_base_url}/api/tags")
            status["ollama"] = "up" if r.status_code == 200 else "down"
    except Exception:  # noqa: BLE001
        status["ollama"] = "down"
    status["claude"] = "configured" if settings.anthropic_api_key else "no_key"
    status["openai"] = "configured" if settings.openai_api_key else "no_key"
    status["gemini"] = "configured" if settings.gemini_api_key else "no_key"
    return {"chain": _provider_chain(), "providers": status}

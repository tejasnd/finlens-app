"""Application settings, loaded from environment / `.env`."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # LLM routing: try `llm_primary`, fall back to `llm_fallback` on failure.
    llm_primary: str = "ollama"      # "ollama" | "claude" | "openai"
    llm_fallback: str = "claude"     # "" disables cloud fallback
    request_timeout: float = 60.0

    # Ollama (local default)
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:3b"

    # Cloud fallback (optional). Override any model id via .env if needed.
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-haiku-4-5"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    # CORS
    frontend_origin: str = "http://localhost:5173"


settings = Settings()

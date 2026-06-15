// Provider metadata + selection for the AI-categorization picker.
//
// The actual LLM calls run server-side in the FastAPI backend (see
// backendCategorizer.js → /api/categorize). This module tracks which provider
// the user picked, their API key, and an optional model override. When no model
// is set the backend falls back to its .env default for that provider.

export const PROVIDERS = {
  claude: {
    name: "Claude",
    company: "Anthropic",
    keyLabel: "Anthropic API Key",
    keyPlaceholder: "sk-ant-api03-...",
    keyStorageKey: "fl_claude_key",
    keyHelp: "console.anthropic.com",
    modelStorageKey: "fl_claude_model",
    modelDefault: "claude-haiku-4-5",
    modelSuggestions: "claude-haiku-4-5 · claude-sonnet-4-6 · claude-opus-4-8",
    modelDescription: "Haiku is fastest and cheapest. Sonnet balances speed and quality. Opus is most capable.",
    modelDocsUrl: "console.anthropic.com/docs/about-claude/models",
  },
  openai: {
    name: "ChatGPT",
    company: "OpenAI",
    keyLabel: "OpenAI API Key",
    keyPlaceholder: "sk-proj-...",
    keyStorageKey: "fl_openai_key",
    keyHelp: "platform.openai.com",
    modelStorageKey: "fl_openai_model",
    modelDefault: "gpt-4o-mini",
    modelSuggestions: "gpt-4o-mini · gpt-4o",
    modelDescription: "gpt-4o-mini is cheaper and faster. gpt-4o offers higher quality categorization.",
    modelDocsUrl: "platform.openai.com/docs/models",
  },
  gemini: {
    name: "Gemini",
    company: "Google",
    keyLabel: "Google AI API Key",
    keyPlaceholder: "AIza...",
    keyStorageKey: "fl_gemini_key",
    keyHelp: "aistudio.google.com",
    modelStorageKey: "fl_gemini_model",
    modelDefault: "gemini-2.0-flash",
    modelSuggestions: "gemini-2.0-flash · gemini-2.0-flash-lite",
    modelDescription: "Flash is the recommended default. Flash Lite is faster and cheaper with slightly lower accuracy.",
    modelDocsUrl: "ai.google.dev/gemini-api/docs/models",
  },
};

export function getAIConfig() {
  const provider = localStorage.getItem("fl_ai_provider") || "claude";
  return { provider: PROVIDERS[provider] ? provider : "claude" };
}

export function setAIConfig(provider) {
  localStorage.setItem("fl_ai_provider", provider);
}

export function hasAIKey() {
  const { provider } = getAIConfig();
  const key = PROVIDERS[provider]?.keyStorageKey;
  return !!(key && localStorage.getItem(key));
}

export function getProviderModel(providerKey) {
  const storageKey = PROVIDERS[providerKey]?.modelStorageKey;
  return storageKey ? (localStorage.getItem(storageKey) || "") : "";
}

export function setProviderModel(providerKey, model) {
  const storageKey = PROVIDERS[providerKey]?.modelStorageKey;
  if (!storageKey) return;
  if (model.trim()) localStorage.setItem(storageKey, model.trim());
  else localStorage.removeItem(storageKey);
}

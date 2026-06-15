// Talks to the local FastAPI backend's server-side LLM categorizer.
// Kept separate from the browser-direct provider (aiCategorizerService) so the
// app degrades gracefully when the backend isn't running.

import { getAIConfig, PROVIDERS, getProviderModel } from "./aiCategorizerService";
import { getCache, setCache } from "../utils/categoryCache";

const HEALTH_TIMEOUT_MS = 1500;

// If the user picked a cloud provider AND set its key in the AI panel, forward
// the provider, key, and optional model override so the backend uses them.
// If no model is stored, the backend falls back to its .env default.
function selectedProviderOverride() {
  const { provider } = getAIConfig();
  const keyName = PROVIDERS[provider]?.keyStorageKey;
  const apiKey = keyName ? localStorage.getItem(keyName) : null;
  if (!apiKey) return null;
  const model = getProviderModel(provider) || undefined;
  return { provider, api_key: apiKey, ...(model ? { model } : {}) };
}

// Cheap liveness probe. Returns false (never throws) if the backend is down.
export async function backendAvailable() {
  try {
    const res = await fetch("/api/health", { signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) });
    return res.ok;
  } catch {
    return false;
  }
}

// Categorize descriptions via the backend, with a local read-through/write-through
// cache so each merchant is only looked up once (across sessions). Returns
// { description: category }. Throws on a non-OK backend response.
//
// Pass { force: true } to bypass the cache on read — used by the manual
// "re-categorize" action so it genuinely re-asks the LLM (e.g. after the user
// adds an API key) instead of replaying a previously cached "Other".
export async function categorizeViaBackend(descriptions, categories, { force = false } = {}) {
  const unique = [...new Set(descriptions)];
  const result = {};
  const uncached = [];
  for (const d of unique) {
    const hit = force ? null : getCache(d);
    if (hit) result[d] = hit;
    else uncached.push(d);
  }
  if (!uncached.length) return result;

  const body = { descriptions: uncached };
  if (categories) body.categories = categories;
  Object.assign(body, selectedProviderOverride() || {});
  const res = await fetch("/api/categorize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Backend categorize failed: ${res.status}`);
  const data = await res.json();
  for (const [d, c] of Object.entries(data.categories || {})) {
    result[d] = c;
    setCache(d, c);
  }
  return result;
}

import { getCache, setCache } from "../utils/categoryCache";
import { CATEGORIES, AI_BATCH_SIZE } from "../constants";

function aiError(message, code) {
  const err = new Error(message);
  err.code = code;
  return err;
}

function providerError(status, providerName) {
  if (status === 401 || status === 403)
    return aiError(`Invalid API key. Check your ${providerName} API key in settings.`, "INVALID_KEY");
  if (status === 429)
    return aiError("Rate limit reached — wait a moment and try again.", "RATE_LIMITED");
  return aiError(`${providerName} API error (${status})`, "API_ERROR");
}

export const PROVIDERS = {
  claude: {
    name: "Claude",
    company: "Anthropic",
    keyLabel: "Anthropic API Key",
    keyPlaceholder: "sk-ant-api03-...",
    keyStorageKey: "fl_claude_key",
    models: [
      {
        id: "claude-haiku-4-5-20251001",
        name: "Claude Haiku 4.5",
        badge: "Best value",
        badgeColor: "#00B894",
        desc: "Fastest and cheapest. Ideal for bulk categorization — handles 500+ transactions in seconds.",
      },
      {
        id: "claude-sonnet-4-6",
        name: "Claude Sonnet 4.6",
        badge: "Recommended",
        badgeColor: "#7C8CF8",
        desc: "Better accuracy on ambiguous merchants. Worth it if you have many 'Other' results.",
      },
    ],
  },
  openai: {
    name: "ChatGPT",
    company: "OpenAI",
    keyLabel: "OpenAI API Key",
    keyPlaceholder: "sk-proj-...",
    keyStorageKey: "fl_openai_key",
    models: [
      {
        id: "gpt-4o-mini",
        name: "GPT-4o Mini",
        badge: "Best value",
        badgeColor: "#00B894",
        desc: "Very cheap and fast. Comparable to Haiku for simple categorization tasks.",
      },
      {
        id: "gpt-4o",
        name: "GPT-4o",
        badge: "High accuracy",
        badgeColor: "#F59E0B",
        desc: "Most capable OpenAI model. Use if accuracy matters more than cost.",
      },
    ],
  },
  gemini: {
    name: "Gemini",
    company: "Google",
    keyLabel: "Google AI API Key",
    keyPlaceholder: "AIzaSy...",
    keyStorageKey: "fl_gemini_key",
    models: [
      {
        id: "gemini-2.0-flash",
        name: "Gemini 2.0 Flash",
        badge: "Recommended",
        badgeColor: "#7C8CF8",
        desc: "Latest Google model. Excellent speed and accuracy at low cost.",
      },
      {
        id: "gemini-1.5-flash",
        name: "Gemini 1.5 Flash",
        badge: "Free tier",
        badgeColor: "#54A0FF",
        desc: "Generous free tier — great for trying out AI categorization at no cost.",
      },
    ],
  },
};

export function getAIConfig() {
  const provider = localStorage.getItem("fl_ai_provider") || "claude";
  const providerConfig = PROVIDERS[provider] || PROVIDERS.claude;
  const defaultModel = providerConfig.models[0].id;
  return {
    provider,
    model: localStorage.getItem("fl_ai_model") || defaultModel,
  };
}

export function setAIConfig(provider, model) {
  localStorage.setItem("fl_ai_provider", provider);
  localStorage.setItem("fl_ai_model", model);
}

export function hasAIKey() {
  const { provider } = getAIConfig();
  const key = PROVIDERS[provider]?.keyStorageKey;
  return !!(key && localStorage.getItem(key));
}

// options.onProgress({ done, total }) — called after each batch
// options.signal — { cancelled: false } flag; set to true to abort remaining batches
export async function categorizeWithAI(descriptions, options = {}) {
  if (!descriptions.length || !hasAIKey()) return {};

  const { onProgress, signal } = options;
  const { provider, model } = getAIConfig();
  const apiKey = localStorage.getItem(PROVIDERS[provider].keyStorageKey) || "";

  const result = {};
  const uncached = [];

  for (const desc of [...new Set(descriptions)]) {
    const cached = getCache(desc);
    if (cached) result[desc] = cached;
    else uncached.push(desc);
  }

  const total = uncached.length;
  let done = 0;

  for (let i = 0; i < uncached.length; i += AI_BATCH_SIZE) {
    if (signal?.cancelled) break;

    const batch = uncached.slice(i, i + AI_BATCH_SIZE);
    let batchResult = {};

    if (provider === "claude") batchResult = await callClaude(batch, model, apiKey);
    else if (provider === "openai") batchResult = await callOpenAI(batch, model, apiKey);
    else if (provider === "gemini") batchResult = await callGemini(batch, model, apiKey);

    Object.assign(result, batchResult);
    for (const [desc, cat] of Object.entries(batchResult)) setCache(desc, cat);

    done += batch.length;
    onProgress?.({ done, total });
  }

  return result;
}

function buildPrompt(descriptions) {
  const validCats = CATEGORIES.join(", ");
  const numbered = descriptions.map((d, i) => `${i + 1}. ${d}`).join("\n");
  return `You are a financial transaction categorizer. Assign each transaction to exactly one category.

Categories: ${validCats}

Transactions:
${numbered}

Rules: Use "Other" only if nothing fits. Respond with JSON only using the number as key: {"1": "Category", "2": "Category", ...}`;
}

function parseResponse(text, descriptions) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return {};
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const result = {};
    for (const [idx, cat] of Object.entries(parsed)) {
      const desc = descriptions[parseInt(idx, 10) - 1];
      if (desc) result[desc] = CATEGORIES.includes(cat) ? cat : "Other";
    }
    return result;
  } catch {
    return {};
  }
}

async function callClaude(descriptions, model, apiKey) {
  let res;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [{ role: "user", content: buildPrompt(descriptions) }],
      }),
    });
  } catch {
    throw aiError("Network error — check your internet connection and try again.", "NETWORK_ERROR");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw body?.error?.message
      ? aiError(body.error.message, res.status === 429 ? "RATE_LIMITED" : res.status === 401 || res.status === 403 ? "INVALID_KEY" : "API_ERROR")
      : providerError(res.status, "Claude");
  }
  const data = await res.json();
  const text = data?.content?.[0]?.text ?? "";
  return parseResponse(text, descriptions);
}

async function callOpenAI(descriptions, model, apiKey) {
  let res;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [{ role: "user", content: buildPrompt(descriptions) }],
      }),
    });
  } catch {
    throw aiError("Network error — check your internet connection and try again.", "NETWORK_ERROR");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw body?.error?.message
      ? aiError(body.error.message, res.status === 429 ? "RATE_LIMITED" : res.status === 401 || res.status === 403 ? "INVALID_KEY" : "API_ERROR")
      : providerError(res.status, "OpenAI");
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  return parseResponse(text, descriptions);
}

async function callGemini(descriptions, model, apiKey) {
  let res;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(descriptions) }] }],
        }),
      }
    );
  } catch {
    throw aiError("Network error — check your internet connection and try again.", "NETWORK_ERROR");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw body?.error?.message
      ? aiError(body.error.message, res.status === 429 ? "RATE_LIMITED" : res.status === 401 || res.status === 403 ? "INVALID_KEY" : "API_ERROR")
      : providerError(res.status, "Gemini");
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return parseResponse(text, descriptions);
}

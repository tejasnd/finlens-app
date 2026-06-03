import { CATEGORY_CACHE_TTL_DAYS, CATEGORY_CACHE_MAX_ENTRIES } from "../constants";

const CACHE_KEY = "finlens-cat-cache";
const TTL_MS = CATEGORY_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

function normalize(desc) {
  return desc.toLowerCase().trim();
}

function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage quota exceeded — clear and retry
    localStorage.removeItem(CACHE_KEY);
  }
}

function pruneCache(cache) {
  const now = Date.now();
  const entries = Object.entries(cache);

  // Remove expired entries
  const fresh = entries.filter(([, v]) => now - v.ts <= TTL_MS);

  // If still over cap, evict oldest first
  if (fresh.length > CATEGORY_CACHE_MAX_ENTRIES) {
    fresh.sort((a, b) => b[1].ts - a[1].ts);
    fresh.splice(CATEGORY_CACHE_MAX_ENTRIES);
  }

  return Object.fromEntries(fresh);
}

export function getCache(desc) {
  const cache = loadCache();
  const entry = cache[normalize(desc)];
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_MS) return null;
  return entry.cat;
}

export function setCache(desc, cat) {
  let cache = loadCache();
  cache[normalize(desc)] = { cat, ts: Date.now() };
  cache = pruneCache(cache);
  saveCache(cache);
}

/**
 * Returns aggregate stats about the current cache state.
 * @returns {{ total: number, expiringSoon: number, lastUpdated: Date|null }}
 */
export function getCacheStats() {
  const cache = loadCache();
  const now = Date.now();
  const entries = Object.values(cache);
  const soonThreshold = (CATEGORY_CACHE_TTL_DAYS - 3) * 24 * 60 * 60 * 1000;
  const expiringSoon = entries.filter((v) => now - v.ts > soonThreshold).length;
  const lastUpdated = entries.length
    ? new Date(Math.max(...entries.map((v) => v.ts)))
    : null;
  return { total: entries.length, expiringSoon, lastUpdated };
}

/**
 * Removes all entries from the category cache.
 */
export function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {}
}

/**
 * Returns the cached timestamp (ms) for a given description, or null if not cached / expired.
 * Used to check if an individual transaction's cache entry is expiring soon.
 */
export function getCacheTimestamp(desc) {
  const cache = loadCache();
  const entry = cache[normalize(desc)];
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_MS) return null;
  return entry.ts;
}

import { MERCHANT_KEY_LENGTH } from "../constants";

const EXCLUDED_STORAGE_KEY = "fl_subs_excluded";

const AMOUNT_TOLERANCE = 0.05; // ±5% of mean
const MIN_TRANSACTIONS = 2;

// Cadence buckets are inclusive on both ends. Intervals between consecutive
// charges (in days) are bucketed by their median to label the subscription.
const CADENCES = [
  { name: "weekly",    minDays: 5,   maxDays: 9,   intervalDays: 7   },
  { name: "bi-weekly", minDays: 12,  maxDays: 16,  intervalDays: 14  },
  { name: "monthly",   minDays: 25,  maxDays: 35,  intervalDays: 30  },
  { name: "quarterly", minDays: 80,  maxDays: 100, intervalDays: 90  },
  { name: "annual",    minDays: 350, maxDays: 380, intervalDays: 365 },
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function normalizeMerchant(desc) {
  return desc
    .toLowerCase()
    .replace(/[*#\d]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MERCHANT_KEY_LENGTH);
}

function median(nums) {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mean(nums) {
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function classifyCadence(intervalDays) {
  for (const c of CADENCES) {
    if (intervalDays >= c.minDays && intervalDays <= c.maxDays) return c;
  }
  return null;
}

// Normalize any cadence to a monthly-equivalent dollar amount so subscriptions
// of mixed frequencies can be summed into a single "monthly spend" stat.
function toMonthlyEquivalent(amount, cadence) {
  return amount * (30 / cadence.intervalDays);
}

// ── localStorage persistence for user-excluded merchants ─────────────────────

export function getExcludedMerchants() {
  try {
    const raw = localStorage.getItem(EXCLUDED_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function setExcludedMerchants(set) {
  try {
    localStorage.setItem(EXCLUDED_STORAGE_KEY, JSON.stringify([...set]));
  } catch {}
}

// ── main detection ───────────────────────────────────────────────────────────

/**
 * Detect recurring subscriptions from a transaction history.
 *
 * A merchant group is a subscription when:
 *   1. It has ≥ MIN_TRANSACTIONS charges
 *   2. The median interval between charges falls inside one of the known cadence buckets
 *   3. Every charge amount is within ±AMOUNT_TOLERANCE of the group mean
 *
 * @param {Array}   transactions   Parsed transactions from the app state
 * @param {Object}  [options]
 * @param {Set}     [options.excluded]      Normalized merchant keys to skip
 * @param {Date}    [options.referenceDate] "Now" for the 12-month window (defaults to current date)
 * @returns {Array} subscriptions sorted by monthly-equivalent cost (descending)
 */
export function detectSubscriptions(transactions, options = {}) {
  if (!Array.isArray(transactions) || transactions.length === 0) return [];

  const { excluded = new Set(), referenceDate = new Date() } = options;
  const twelveMonthCutoff = new Date(referenceDate.getTime() - 365 * MS_PER_DAY);

  // 1) Group positive-amount transactions by normalized merchant
  const groups = new Map();
  for (const t of transactions) {
    if (!(t.amount > 0)) continue;
    const key = normalizeMerchant(t.description || "");
    if (!key) continue;
    if (excluded.has(key)) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }

  const out = [];

  for (const [key, group] of groups) {
    if (group.length < MIN_TRANSACTIONS) continue;

    const sorted = [...group].sort((a, b) => a.date - b.date);

    // 2) Interval-based cadence check
    const intervals = [];
    for (let i = 1; i < sorted.length; i++) {
      intervals.push((sorted[i].date - sorted[i - 1].date) / MS_PER_DAY);
    }
    const cadence = classifyCadence(median(intervals));
    if (!cadence) continue;

    // 3) Amount-stability check
    const amounts = sorted.map((t) => t.amount);
    const avgAmount = mean(amounts);
    if (avgAmount <= 0) continue;
    const maxDeviation = Math.max(...amounts.map((a) => Math.abs(a - avgAmount))) / avgAmount;
    if (maxDeviation > AMOUNT_TOLERANCE) continue;

    // Use mean of the last 3 charges for the current-estimate amount —
    // captures recent price changes (e.g. a Netflix bump) instead of the lifetime average.
    const recent = sorted.slice(-3).map((t) => t.amount);
    const estimatedAmount = mean(recent);

    const lastChargeDate = sorted[sorted.length - 1].date;
    const nextExpectedDate = new Date(lastChargeDate.getTime() + cadence.intervalDays * MS_PER_DAY);

    const totalLast12Months = sorted
      .filter((t) => t.date >= twelveMonthCutoff && t.date <= referenceDate)
      .reduce((s, t) => s + t.amount, 0);

    // Use the most-frequent raw description for the display name —
    // bank statements often vary the same merchant across charges (e.g. "NETFLIX.COM"
    // vs "NETFLIX 866-5797"), and the dominant variant is usually the readable one.
    const freq = {};
    for (const t of sorted) {
      const name = (t.description || "").trim();
      if (!name) continue;
      freq[name] = (freq[name] || 0) + 1;
    }
    const displayName =
      Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || key;

    out.push({
      key,
      name: displayName,
      category: sorted[sorted.length - 1].category,
      estimatedAmount,
      frequency: cadence.name,
      monthlyEquivalent: toMonthlyEquivalent(estimatedAmount, cadence),
      lastChargeDate,
      nextExpectedDate,
      totalLast12Months,
      chargeCount: sorted.length,
    });
  }

  return out.sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent);
}

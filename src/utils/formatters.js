// Strips noise from bank transaction descriptions to produce a stable grouping key.
// Removes: trailing/embedded store numbers, dates, card last-4, common suffixes.
export function merchantKey(description) {
  return description
    .toUpperCase()
    // card last-4: "XXXX 1234" or "...1234" at end
    .replace(/\b\d{4}\b\s*$/g, "")
    // dates: MM/DD, MM-DD, MMDDYY, MMDDYYYY patterns
    .replace(/\b\d{2}[/-]\d{2}([/-]\d{2,4})?\b/g, "")
    // store / location IDs: "#1234", "# 1234", "NO 1234", "NO. 1234"
    .replace(/#\s*\d+/g, "")
    .replace(/\bNO\.?\s*\d+/g, "")
    // trailing sequences of digits (store numbers, location codes)
    .replace(/\s+\d[\d-]*$/g, "")
    // common noise suffixes
    .replace(/\b(STORE|LOCATION|BRANCH|UNIT|STE|SUITE|LLC|INC|CORP|LTD|CO)\b\.?/g, "")
    // collapse whitespace
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Groups an array of transaction descriptions by merchantKey and returns the most
// common raw description within each group as the display name.
export function groupMerchants(transactions) {
  const groups = {};

  for (const t of transactions) {
    const key = merchantKey(t.description) || "Unknown";
    if (!groups[key]) groups[key] = { key, total: 0, count: 0, category: t.category, _freq: {} };
    groups[key].total += t.amount;
    groups[key].count++;
    const raw = t.description.trim() || "Unknown";
    groups[key]._freq[raw] = (groups[key]._freq[raw] || 0) + 1;
  }

  return Object.values(groups).map((g) => {
    const name = Object.entries(g._freq).sort((a, b) => b[1] - a[1])[0][0];
    const { _freq, ...rest } = g;
    return { ...rest, name };
  });
}

export const fmt = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

export const fmtD = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

export const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) + "%" : "0%");

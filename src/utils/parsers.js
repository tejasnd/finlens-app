export function guessColumns(headers) {
  const h = headers.map((x) => String(x).toLowerCase().trim());
  const find = (...terms) => {
    const i = h.findIndex((c) => terms.some((t) => c.includes(t)));
    return i >= 0 ? headers[i] : null;
  };
  return {
    date:   find("date", "time", "txn date", "transaction date", "posted date", "post date", "trans date"),
    amount: find("amount", "debit", "charge", "sum", "total", "payment amount", "transaction amount", "credit", "withdrawal", "spending"),
    desc:   find("description", "merchant", "memo", "name", "narration", "particular", "details", "payee", "vendor", "store", "transaction name"),
  };
}

export function parseAmount(val) {
  if (val == null || val === "") return null;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? null : Math.abs(n);
}

export function parseDate(val) {
  if (!val) return null;
  if (typeof val === "number") {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d;
  }
  const str = String(val).trim();
  const mdy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (mdy) {
    const [, m, day, y] = mdy;
    const year = y.length === 2 ? 2000 + +y : +y;
    const parsed = new Date(year, +m - 1, +day);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  const fallback = new Date(val);
  return isNaN(fallback.getTime()) ? null : fallback;
}

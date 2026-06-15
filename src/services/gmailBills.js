// Gmail bill ingestion (client side).
//
// Statement emails are *summaries*, not full statements — Gmail rarely contains
// every line-item transaction. So a retrieved bill becomes a single record (the
// statement balance, due date, and issuer), categorized as "Finance & Fees" so
// it never double-counts against your itemized spend. Use a CSV/Excel export for
// the individual transactions.

import { parseDate } from "../utils/parsers";

// Pull a human issuer name out of a Gmail "From" header
// (e.g. 'Chase <no-reply@chase.com>' → "Chase"; falls back to the domain).
function issuerFrom(sender) {
  if (!sender) return "Card";
  const named = sender.split("<")[0].trim().replace(/^"|"$/g, "");
  if (named) return named;
  const m = sender.match(/@([\w.-]+)/);
  return m ? m[1].split(".")[0] : "Card";
}

// Fetch recent statement emails. `newerThan` is a Gmail window like "1m"/"30d"/"1y".
// Throws an Error (with .status) on a non-OK response so callers can branch on 409.
export async function fetchGmailBills(newerThan = "1m", maxResults = 25) {
  const res = await fetch(
    `/api/gmail/bills?newer_than=${encodeURIComponent(newerThan)}&max_results=${maxResults}`
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.detail || `Gmail search failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data.bills || [];
}

// Map one bill email to a transaction-shaped bill record.
export function billToTransaction(bill, owner) {
  const p = bill.parsed || {};
  const amount = p.statement_balance ?? p.minimum_due ?? 0;

  let date = parseDate(p.due_date);
  if (!date && bill.date) {
    const d = new Date(bill.date);
    if (!isNaN(d.getTime())) date = d;
  }
  if (!date) date = new Date();

  const issuer = issuerFrom(bill.sender);
  return {
    // Keyed on the Gmail message id so re-retrieving the same bill dedupes.
    id: `gmail-${bill.id}`,
    source: "Gmail",
    owner,
    date,
    amount,
    description: `${issuer} statement${p.due_date ? ` (due ${p.due_date})` : ""}`,
    category: "Finance & Fees",
    splitType: "personal",
  };
}

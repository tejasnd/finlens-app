// Client for the backend RAG endpoints (/api/index, /api/query).
// All retrieval + generation happens in the local FastAPI backend.

function serialize(transactions) {
  return transactions.map((t) => ({
    id: t.id,
    owner: t.owner ?? "",
    date: t.date instanceof Date ? t.date.toISOString() : t.date ?? "",
    amount: t.amount ?? 0,
    description: t.description ?? "",
    category: t.category ?? "Other",
    splitType: t.splitType ?? "personal",
    source: t.source ?? "",
  }));
}

// Push the current dataset to the backend, which embeds + indexes it.
export async function indexTransactions(transactions) {
  const res = await fetch("/api/index", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transactions: serialize(transactions) }),
  });
  if (!res.ok) throw new Error(`Indexing failed (${res.status})`);
  return res.json(); // { indexed }
}

// Ask a natural-language question. Returns { answer, provider, retrieved }.
export async function askQuestion(question) {
  const res = await fetch("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `Query failed (${res.status})`);
  }
  return res.json();
}

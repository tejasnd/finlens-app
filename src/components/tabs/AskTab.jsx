import { useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { fmt } from "../../utils/formatters";
import { CAT_COLORS } from "../../constants";
import { indexTransactions, askQuestion } from "../../services/ragService";

const SUGGESTIONS = [
  "How much did we spend on dining out last month?",
  "What were our biggest purchases?",
  "Which subscriptions are we paying for?",
  "Who spent more on groceries?",
];

export default function AskTab() {
  const { transactions, isEmpty } = useAppContext();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function ask(q) {
    const query = (q ?? question).trim();
    if (!query || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      // Sync the current dataset, then run the RAG query.
      await indexTransactions(transactions);
      const res = await askQuestion(query);
      setResult(res);
    } catch (e) {
      setError(
        e.message?.includes("Failed to fetch") || e.message?.includes("NetworkError")
          ? "Can't reach the FinLens backend. Start it with: uvicorn app.main:app --port 8000"
          : e.message || "Something went wrong."
      );
    }
    setLoading(false);
  }

  if (isEmpty) {
    return (
      <div className="card">
        <div className="card-title">Ask FinLens</div>
        <p className="text-muted">Upload some transactions first, then ask questions about your spending in plain English.</p>
      </div>
    );
  }

  return (
    <div className="col gap-4">
      <div className="card">
        <div className="card-title">Ask FinLens</div>
        <p className="text-muted text-sm mb-3">
          Natural-language questions over your financial data. Retrieval + generation run locally (RAG).
        </p>
        <form
          onSubmit={(e) => { e.preventDefault(); ask(); }}
          className="row gap-2"
        >
          <input
            className="flex-1"
            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card-2)", color: "var(--text)" }}
            placeholder="e.g. How much did we spend on travel this year?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            aria-label="Ask a question about your finances"
          />
          <button type="submit" className="btn-primary" disabled={loading || !question.trim()}>
            {loading ? "Thinking…" : "Ask"}
          </button>
        </form>

        <div className="row gap-2 mt-3" style={{ flexWrap: "wrap" }}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              className="chip"
              style={{ cursor: "pointer", border: "1px solid var(--border)", background: "transparent", color: "var(--text-2)", borderRadius: 999, padding: "4px 12px", fontSize: 12 }}
              onClick={() => { setQuestion(s); ask(s); }}
              disabled={loading}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="warn"><span>{error}</span></div>}

      {result && (
        <div className="card">
          <div className="row-between mb-2">
            <div className="card-title" style={{ margin: 0 }}>Answer</div>
            <span className="text-xs text-faint">via {result.provider}</span>
          </div>
          <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{result.answer}</p>

          {result.retrieved?.length > 0 && (
            <details className="mt-3">
              <summary className="text-sm text-muted" style={{ cursor: "pointer" }}>
                Retrieved {result.retrieved.length} relevant transactions
              </summary>
              <div className="col gap-2 mt-2">
                {result.retrieved.map((r, i) => (
                  <div key={i} className="row gap-3 surface-tile" style={{ padding: "7px 11px" }}>
                    <span className="mono text-xs text-faint" style={{ minWidth: 78 }}>{r.date}</span>
                    <span className="mono text-sm fw-700" style={{ minWidth: 80 }}>{fmt(r.amount)}</span>
                    <span className="text-xs" style={{ color: CAT_COLORS[r.category], minWidth: 100 }}>{r.category}</span>
                    <span className="text-sm truncate flex-1">{r.description}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

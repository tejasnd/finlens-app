import { CATEGORIES } from "../../constants";
import ConfirmButton from "./ConfirmButton";
import { useAppContext } from "../../context/AppContext";

export default function RulesPanel() {
  const { customRules, newKw, setNewKw, newCat, setNewCat, addRule, removeRule } = useAppContext();

  return (
    <div className="rules-panel">
      <div style={{ maxWidth: 720 }}>
        <div className="fw-600 text-base text-muted mb-3">
          Custom Rules{" "}
          <span className="text-faint" style={{ fontWeight: 400 }}>— override auto-categorization</span>
        </div>
        <div className="row gap-3 mb-3 wrap">
          <input
            className="inp flex-1"
            aria-label="Rule keyword"
            placeholder='Keyword (e.g. "wholefds")'
            value={newKw}
            onChange={(e) => setNewKw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addRule()}
            style={{ minWidth: 140 }}
          />
          <select className="inp" aria-label="Rule category" value={newCat} onChange={(e) => setNewCat(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <button className="btn p" onClick={addRule}>Add</button>
        </div>
        <div className="row wrap gap-2">
          {customRules.length === 0 ? (
            <span className="text-faint text-sm">No rules yet.</span>
          ) : (
            customRules.map((r, i) => (
              <span key={i} className="chip">
                <span className="text-accent">"{r.keyword}"</span>
                <span className="text-faint">→</span>
                <span>{r.category}</span>
                <ConfirmButton onConfirm={() => removeRule(i)} label="Remove?">
                  <button aria-label={`Remove rule for "${r.keyword}"`} className="icon-btn" style={{ fontSize: 10, padding: 0 }}>✕</button>
                </ConfirmButton>
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

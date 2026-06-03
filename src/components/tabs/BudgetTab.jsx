import { useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { CATEGORIES, CAT_COLORS } from "../../constants";
import { fmt } from "../../utils/formatters";
import { predictBudget } from "../../utils/budgetPredictor";
import ConfirmButton from "../layout/ConfirmButton";
import { useAppContext } from "../../context/AppContext";

const tooltipStyle = { background: "var(--card-2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" };

export default function BudgetTab() {
  const {
    monthlyData, budgets, setBudgets, budgetStatus,
    editBudgetCat, setEditBudgetCat, budgetVal, setBudgetVal,
    transactions, notify,
  } = useAppContext();
  const [valError, setValError] = useState("");

  const cur = monthlyData?.length ? monthlyData[monthlyData.length - 1] : null;
  const predictions = predictBudget(transactions, budgets);

  const saveBudget = () => {
    if (!editBudgetCat) { setValError("Pick a category."); return; }
    const val = parseFloat(budgetVal);
    if (!Number.isFinite(val) || val <= 0) {
      setValError("Enter a positive number.");
      return;
    }
    setValError("");
    setBudgets((p) => ({ ...p, [editBudgetCat]: val }));
    setEditBudgetCat(null);
    setBudgetVal("");
    notify?.(`Budget set: ${editBudgetCat} → $${val.toLocaleString()}`, "success");
  };

  return (
    <div className="col-gap-12">
      <div className="card">
        <div className="row-between mb-6">
          <div>
            <div className="fw-600 text-lg">Monthly Budget Targets</div>
            <div className="text-sm text-muted mt-1">
              Actuals from most recent month{cur ? ` (${cur.month})` : ""}
            </div>
          </div>
          <div className="row gap-3">
            <button className="btn accent text-sm" onClick={() => { setEditBudgetCat(""); setBudgetVal(""); setValError(""); }}>
              + Add Budget
            </button>
          </div>
        </div>

        {editBudgetCat !== null && (
          <div className="card-2-tile mb-6" style={{ padding: "12px" }}>
            <div className="row gap-3 wrap">
              <select className="inp flex-1" style={{ minWidth: 140 }} aria-label="Budget category" value={editBudgetCat} onChange={(e) => { setEditBudgetCat(e.target.value); setValError(""); }}>
                <option value="">-- Category --</option>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <input
                className="inp"
                type="number"
                min="1"
                placeholder="$ amount"
                aria-label="Budget amount in dollars"
                value={budgetVal}
                onChange={(e) => { setBudgetVal(e.target.value); setValError(""); }}
                style={{ width: 120 }}
              />
              <button className="btn accent text-sm" onClick={saveBudget}>Save</button>
              <button className="btn s text-sm" onClick={() => { setEditBudgetCat(null); setBudgetVal(""); setValError(""); }}>Cancel</button>
            </div>
            {valError && <div className="text-sm mt-2" style={{ color: "#EF4444" }}>{valError}</div>}
          </div>
        )}

        {Object.keys(budgets).length === 0 ? (
          <div className="text-base text-faint text-center" style={{ padding: "20px 0" }}>
            No budgets set yet. Click "+ Add Budget" to start.
          </div>
        ) : (
          <div className="col gap-3">
            {CATEGORIES.filter((c) => budgets[c]).map((c) => {
              const actual = cur ? cur[c] || 0 : 0;
              const budget = budgets[c];
              const pp = budget > 0 ? Math.min(100, (actual / budget) * 100) : 0;
              const over = actual > budget;
              return (
                <div key={c} className="card" style={{ padding: "12px 14px", borderLeft: `3px solid ${over ? "#EF4444" : CAT_COLORS[c] || "#778CA3"}` }}>
                  <div className="row-between mb-3">
                    <div className="row gap-3">
                      <span className="fw-600 text-lg">{c}</span>
                      {over && <span className="badge" style={{ background: "rgba(239,68,68,.15)", color: "#EF4444" }}>Over</span>}
                    </div>
                    <div className="row gap-4">
                      <span className="mono text-base" style={{ color: over ? "#EF4444" : CAT_COLORS[c] }}>{fmt(actual)}</span>
                      <span className="text-faint text-sm">/ {fmt(budget)}</span>
                      <button aria-label={`Edit budget for ${c}`} onClick={() => { setEditBudgetCat(c); setBudgetVal(budget); setValError(""); }} className="icon-btn">✏</button>
                      <ConfirmButton onConfirm={() => setBudgets((p) => { const n = { ...p }; delete n[c]; return n; })} label="Remove?">
                        <button aria-label={`Remove budget for ${c}`} className="icon-btn">✕</button>
                      </ConfirmButton>
                    </div>
                  </div>
                  <div className="pb"><div className="pf" style={{ width: `${pp}%`, background: over ? "#EF4444" : CAT_COLORS[c] || "#778CA3" }} /></div>
                  <div className="row-between mt-2 text-xs text-muted">
                    <span>{pp.toFixed(0)}% used</span>
                    <span>{over ? `${fmt(actual - budget)} over` : `${fmt(budget - actual)} left`}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {predictions.length > 0 && (
        <div className="card" style={{ borderLeft: "3px solid #F59E0B" }}>
          <div className="fw-600 text-lg mb-4 text-amber">
            Predictions — {predictions[0]?.daysLeft} days left this month
          </div>
          <div className="col gap-3">
            {predictions.map((p) => (
              <div key={p.category} className="card-2-tile" style={{ padding: "10px 12px" }}>
                <div className="row-between mb-2">
                  <div className="row gap-3">
                    <span className="fw-600 text-base">{p.category}</span>
                    <span className="badge" style={{
                      background: p.severity === "high" ? "rgba(239,68,68,.15)" : "rgba(245,158,11,.12)",
                      color: p.severity === "high" ? "#EF4444" : "#F59E0B",
                    }}>
                      {p.severity === "high" ? "High risk" : "Watch"}
                    </span>
                  </div>
                  <span className="mono text-sm" style={{ color: "#EF4444" }}>
                    +{fmt(p.overage)} over
                  </span>
                </div>
                <div className="row-between text-xs text-muted">
                  <span>So far: {fmt(p.actual)}</span>
                  <span>Projected: {fmt(p.projected)}</span>
                  <span>Budget: {fmt(p.budget)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {budgetStatus.length > 0 && (
        <div className="g2">
          <div className="card">
            <div className="card-title">Budget vs Actual</div>
            <div role="img" aria-label="Bar chart comparing budget targets to actual spending by category">
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={budgetStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E3A56" />
                  <XAxis dataKey="category" stroke="#6E90AE" fontSize={9} tickFormatter={(v) => v.split(" ")[0]} />
                  <YAxis stroke="#6E90AE" fontSize={10} tickFormatter={(v) => "$" + (v / 1000).toFixed(1) + "k"} />
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={tooltipStyle} />
                  <Legend formatter={(v) => <span className="text-muted text-xs">{v}</span>} />
                  <Bar dataKey="budget" name="Budget" fill="#1E3A56" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" name="Actual" fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Budget Health</div>
            <div className="col gap-3">
              {budgetStatus.map((b) => (
                <div key={b.category} className="row gap-3">
                  <div className="text-sm text-muted text-right nowrap truncate" style={{ width: 90 }}>{b.category}</div>
                  <div
                    className="flex-1"
                    role="progressbar"
                    aria-valuenow={Math.min(100, b.pct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${b.category} budget: ${b.pct.toFixed(0)}%${b.over ? " (over budget)" : ""}`}
                    style={{ height: 5, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}
                  >
                    <div style={{ height: "100%", width: `${Math.min(100, b.pct)}%`, background: b.over ? "#EF4444" : CAT_COLORS[b.category] || "#6366F1", borderRadius: 3 }} />
                  </div>
                  <div className="text-xs text-right" style={{ color: b.over ? "#EF4444" : "var(--text-2)", minWidth: 32 }}>
                    {b.pct.toFixed(0)}%{b.over && <span className="sr-only"> (over budget)</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

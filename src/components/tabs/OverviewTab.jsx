import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { CAT_COLORS } from "../../constants";
import { fmt } from "../../utils/formatters";
import { useAppContext } from "../../context/AppContext";

const tooltipStyle = { background: "var(--card-2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" };

export default function OverviewTab() {
  const { totalSpend, avgMonthly, filtered, spendOnly, catTotals, topMerchants } = useAppContext();
  const stats = [
    { l: "Total Spent",   v: fmt(totalSpend),                                            a: "var(--accent-h)" },
    { l: "Avg / Month",   v: fmt(avgMonthly),                                            a: "var(--teal)" },
    { l: "Transactions",  v: filtered.length.toLocaleString(),                           a: "var(--amber)" },
    { l: "Avg / Txn",     v: fmt(spendOnly.length ? totalSpend / spendOnly.length : 0),  a: "var(--rose)" },
  ];

  return (
    <>
      <div className="g4 mb-6">
        {stats.map((s) => (
          <div key={s.l} className="stat">
            <div className="stat-label">{s.l}</div>
            <div className="mono stat-value" style={{ color: s.a }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div className="g2 mb-5">
        <div className="card">
          <div className="card-title">Spending by Category</div>
          <div role="img" aria-label="Pie chart showing spending distribution across categories">
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie
                  data={catTotals}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="50%"
                  outerRadius={88}
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  fontSize={10}
                >
                  {catTotals.map((c) => <Cell key={c.name} fill={CAT_COLORS[c.name] || "#778CA3"} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} contentStyle={tooltipStyle} />
                <Legend formatter={(v) => <span className="text-muted text-xs">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Category Breakdown</div>
          <div className="col gap-3 overflow-y" style={{ maxHeight: 250 }}>
            {catTotals.map((c) => (
              <div key={c.name}>
                <div className="row-between mb-1 text-base">
                  <span className="text-muted">{c.name}</span>
                  <span className="mono text-sm fw-700" style={{ color: CAT_COLORS[c.name] }}>{fmt(c.value)}</span>
                </div>
                <div className="pb">
                  <div className="pf" style={{ width: `${(c.value / catTotals[0].value) * 100}%`, background: CAT_COLORS[c.name] || "#778CA3" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Top 10 Merchants</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 9 }}>
          {topMerchants.map((m, i) => (
            <div key={m.name} className="row gap-3 surface-tile" style={{ padding: "9px 12px" }}>
              <div className="fw-700 text-faint text-sm" style={{ minWidth: 20 }}>#{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="text-base fw-500 truncate">{m.name}</div>
                <div className="text-xs text-faint">
                  {m.count} txns · <span style={{ color: CAT_COLORS[m.category] }}>{m.category}</span>
                </div>
              </div>
              <div className="mono text-sm fw-700 text-accent">{fmt(m.total)}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

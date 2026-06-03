import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { CAT_COLORS } from "../../constants";
import { fmt } from "../../utils/formatters";
import { useAppContext } from "../../context/AppContext";

const tooltipStyle = { background: "var(--card-2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" };

export default function CoupleTab() {
  const { spendOnly, personA, personB, settlement, splitPct, setShowSplitModal } = useAppContext();
  const aTxns = spendOnly.filter((t) => t.owner === personA.name);
  const bTxns = spendOnly.filter((t) => t.owner === personB.name);
  const aTotal = aTxns.reduce((s, t) => s + t.amount, 0);
  const bTotal = bTxns.reduce((s, t) => s + t.amount, 0);
  const aShared = aTxns.filter((t) => t.splitType === "shared").reduce((s, t) => s + t.amount, 0);
  const bShared = bTxns.filter((t) => t.splitType === "shared").reduce((s, t) => s + t.amount, 0);

  const catSplit = {};
  spendOnly.forEach((t) => {
    if (!catSplit[t.category]) catSplit[t.category] = { cat: t.category, k: 0, t: 0 };
    if (t.owner === personA.name) catSplit[t.category].k += t.amount;
    else catSplit[t.category].t += t.amount;
  });
  const catSplitArr = Object.values(catSplit).filter((c) => c.k + c.t > 0).sort((a, b) => (b.k + b.t) - (a.k + a.t));

  const settlementColor =
    settlement.net === 0 ? "#00B894" : settlement.net > 0 ? personA.color : personB.color;

  return (
    <div className="col-gap-12">
      <div className="card" style={{ borderTop: `3px solid ${settlementColor}` }}>
        <div className="row-start wrap gap-6">
          <div>
            <div className="sec">Settlement Summary</div>
            <div className="fw-700 text-2xl" style={{ color: settlementColor }}>{settlement.settlement}</div>
            <div className="text-sm text-muted mt-1">
              Based on {splitPct.A}/{splitPct.B} split ·{" "}
              <button className="btn s" style={{ fontSize: 10, padding: "2px 8px" }} onClick={() => setShowSplitModal(true)}>
                Change
              </button>
            </div>
          </div>
          <div className="g2">
            {[
              { p: personA, paid: settlement.aPaid, owes: settlement.aOwes },
              { p: personB, paid: settlement.bPaid, owes: settlement.bOwes },
            ].map(({ p, paid, owes }) => (
              <div key={p.name} className="card-2-tile" style={{ padding: "10px 14px", borderLeft: `3px solid ${p.color}` }}>
                <div className="fw-700 text-base mb-2" style={{ color: p.color }}>{p.name}</div>
                <div className="text-base text-muted">Paid: <span className="mono text-base" style={{ color: "var(--text)" }}>{fmt(paid)}</span></div>
                <div className="text-base text-muted">Owes (shared): <span className="mono text-base" style={{ color: p.color }}>{fmt(owes)}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="g2">
        {[
          { p: personA, total: aTotal, shared: aShared, personal: aTotal - aShared, txns: aTxns.length },
          { p: personB, total: bTotal, shared: bShared, personal: bTotal - bShared, txns: bTxns.length },
        ].map(({ p, total, shared, personal, txns }) => (
          <div key={p.name} className="card" style={{ borderTop: `3px solid ${p.color}` }}>
            <div className="fw-700 text-lg mb-4" style={{ color: p.color }}>{p.name}</div>
            <div className="mono fw-700 mb-2" style={{ fontSize: 24 }}>{fmt(total)}</div>
            <div className="text-sm text-muted mb-4">{txns} transactions</div>
            {[["Personal", personal, "#778CA3"], ["Shared (paid by)", shared, p.color]].map(([l, v, c]) => (
              <div key={l} className="mb-3">
                <div className="row-between mb-1 text-sm">
                  <span className="text-muted">{l}</span>
                  <span className="mono text-sm" style={{ color: c }}>{fmt(v)}</span>
                </div>
                <div className="pb"><div className="pf" style={{ width: total ? `${(v / total) * 100}%` : "0%", background: c }} /></div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">
          Spending by Category — {personA.name} vs {personB.name}
        </div>
        <div role="img" aria-label={`Bar chart comparing ${personA.name} and ${personB.name} spending by category`}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={catSplitArr.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E3A56" />
              <XAxis dataKey="cat" stroke="#6E90AE" fontSize={10} tickFormatter={(v) => v.split(" ")[0]} />
              <YAxis stroke="#6E90AE" fontSize={10} tickFormatter={(v) => "$" + (v / 1000).toFixed(0) + "k"} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={tooltipStyle} />
              <Legend formatter={(v) => <span className="text-muted text-xs">{v}</span>} />
              <Bar dataKey="k" name={personA.name} fill={personA.color} radius={[4, 4, 0, 0]} />
              <Bar dataKey="t" name={personB.name} fill={personB.color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card overflow-x">
        <div className="card-title">Detailed Category Split</div>
        <table className="tbl">
          <thead>
            <tr className="tbl-row">
              {["Category", personA.name, personB.name, "Total", "A / B Split"].map((h) => (
                <th key={h} className="th" style={{ textAlign: h === "Category" ? "left" : "right" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {catSplitArr.map((c) => (
              <tr key={c.cat} className="tr tbl-row">
                <td className="td-md">
                  <span className="badge" style={{ background: (CAT_COLORS[c.cat] || "#778CA3") + "22", color: CAT_COLORS[c.cat] || "#778CA3" }}>{c.cat}</span>
                </td>
                <td className="mono td-md-r text-base" style={{ color: personA.color }}>{fmt(c.k)}</td>
                <td className="mono td-md-r text-base" style={{ color: personB.color }}>{fmt(c.t)}</td>
                <td className="mono td-md-r fw-700 text-base">{fmt(c.k + c.t)}</td>
                <td className="td-md-r text-sm text-muted">
                  {(c.k + c.t) > 0 ? `${((c.k / (c.k + c.t)) * 100).toFixed(0)}% / ${((c.t / (c.k + c.t)) * 100).toFixed(0)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

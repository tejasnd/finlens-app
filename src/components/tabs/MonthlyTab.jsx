import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { CAT_COLORS } from "../../constants";
import { fmt } from "../../utils/formatters";
import { useAppContext } from "../../context/AppContext";

const tooltipStyle = { background: "var(--card-2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" };
const legendFormatter = (v) => <span className="text-muted text-xs">{v}</span>;

export default function MonthlyTab() {
  const { monthlyData, catTotals, personA, personB } = useAppContext();
  return (
    <div className="col-gap-12">
      <div className="card">
        <div className="card-title">Monthly Trend</div>
        <div role="img" aria-label="Line chart showing monthly spending trend by person">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E3A56" />
              <XAxis dataKey="month" stroke="#6E90AE" fontSize={10} />
              <YAxis stroke="#6E90AE" fontSize={10} tickFormatter={(v) => "$" + (v / 1000).toFixed(0) + "k"} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={tooltipStyle} />
              <Legend formatter={legendFormatter} />
              <Line type="monotone" dataKey="total" name="Combined" stroke="#818CF8" strokeWidth={2.5} dot={{ fill: "#818CF8", r: 3 }} />
              <Line type="monotone" dataKey="personA" name={personA.name} stroke={personA.color} strokeWidth={2} strokeDasharray="4 2" dot={{ fill: personA.color, r: 3 }} />
              <Line type="monotone" dataKey="personB" name={personB.name} stroke={personB.color} strokeWidth={2} strokeDasharray="4 2" dot={{ fill: personB.color, r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Monthly by Category (Stacked)</div>
        <div role="img" aria-label="Stacked bar chart showing monthly spending by category">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E3A56" />
            <XAxis dataKey="month" stroke="#6E90AE" fontSize={10} />
            <YAxis stroke="#6E90AE" fontSize={10} tickFormatter={(v) => "$" + (v / 1000).toFixed(0) + "k"} />
            <Tooltip formatter={(v) => fmt(v)} contentStyle={tooltipStyle} />
            <Legend formatter={legendFormatter} />
            {catTotals.slice(0, 8).map((c) => (
              <Bar key={c.name} dataKey={c.name} stackId="a" fill={CAT_COLORS[c.name]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
        </div>
      </div>

      <div className="card overflow-x">
        <div className="card-title">Monthly Breakdown Table</div>
        <table className="tbl">
          <thead>
            <tr className="tbl-row">
              <th className="th" style={{ textAlign: "left" }}>Month</th>
              <th className="th text-right">Total</th>
              <th className="th text-right" style={{ color: personA.color }}>{personA.name}</th>
              <th className="th text-right" style={{ color: personB.color }}>{personB.name}</th>
              {catTotals.slice(0, 5).map((c) => (
                <th key={c.name} className="th text-right" style={{ color: CAT_COLORS[c.name] }}>
                  {c.name.split(" ")[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthlyData.map((m) => (
              <tr key={m.month} className="tr tbl-row">
                <td className="td-md fw-500">{m.month}</td>
                <td className="mono td-md-r text-accent fw-700 text-base">{fmt(m.total)}</td>
                <td className="mono td-md-r text-base" style={{ color: personA.color }}>{fmt(m.personA)}</td>
                <td className="mono td-md-r text-base" style={{ color: personB.color }}>{fmt(m.personB)}</td>
                {catTotals.slice(0, 5).map((c) => (
                  <td key={c.name} className="mono td-md-r text-sm" style={{ color: m[c.name] ? "var(--text)" : "var(--text-3)" }}>
                    {m[c.name] ? fmt(m[c.name]) : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

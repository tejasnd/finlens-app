import { useMemo, useState } from "react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ReferenceLine,
} from "recharts";
import { fmt } from "../../utils/formatters";
import { useAppContext } from "../../context/AppContext";
import { projectBalance, calculateGoalPlan } from "../../utils/balanceProjector";

const tooltipStyle = { background: "var(--card-2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" };

export default function PlanningTab() {
  const {
    personA, personB, planData, setPlanData,
    editPlan, setEditPlan, avgMonthly, totalNet, totalInv, savingsRate,
  } = useAppContext();
  const invItems = [
    { k: "k401k",    label: `${personA.name}'s 401K`, color: personA.color },
    { k: "t401k",    label: `${personB.name}'s 401K`, color: personB.color },
    { k: "rothIRA",  label: "Roth IRA",    color: "#A29BFE" },
    { k: "hsa",      label: "HSA",         color: "var(--teal)" },
    { k: "brokerage",label: "Brokerage",   color: "#FFC312" },
    { k: "hysa",     label: "HYSA",        color: "#06C5D8" },
    { k: "overseas", label: "Overseas",    color: "#FF9F43" },
  ];

  const incomeCards = [
    { p: personA, incomeKey: "personAIncome", pctKey: "personA401k", gross: planData.personAIncome, pct401k: planData.personA401k },
    { p: personB, incomeKey: "personBIncome", pctKey: "personB401k", gross: planData.personBIncome, pct401k: planData.personB401k },
  ];

  const summaryStats = [
    { l: "Monthly Spend", v: fmt(avgMonthly), c: "#FF6B6B", i: "💸" },
    { l: "Savings Rate",  v: `${savingsRate}%`, c: +savingsRate > 20 ? "#00B894" : +savingsRate > 10 ? "#FFC312" : "#FF6B6B", i: "💰" },
    { l: "Total Investments", v: fmt(totalInv), c: "#A29BFE", i: "📈" },
  ];

  const annualGoals = [
    { l: "Roth IRA", goal: planData.rothGoal, current: planData.investments.rothIRA || 0, color: "#A29BFE", key: "rothGoal" },
    { l: "HSA", goal: planData.hsaGoal, current: planData.investments.hsa || 0, color: "var(--teal)", key: "hsaGoal" },
    { l: "Annual Savings", goal: planData.savingsGoal, current: Math.max(0, (totalNet - avgMonthly) * 12), color: "#FFC312", key: "savingsGoal" },
  ];

  // ── Forward-looking planning ────────────────────────────────────────────────
  const surplus = totalNet - avgMonthly;

  const [savingsTarget, setSavingsTarget] = useState(planData.savingsGoal || 0);
  const [timelineMonths, setTimelineMonths] = useState(12);

  const goalPlan = useMemo(
    () => calculateGoalPlan({
      targetAmount: savingsTarget,
      months: timelineMonths,
      currentSurplus: surplus,
    }),
    [savingsTarget, timelineMonths, surplus]
  );

  const projection = useMemo(
    () => projectBalance({
      startBalance: totalInv,
      monthlyDelta: surplus,
      months: 12,
      goalAmount: savingsTarget > 0 ? savingsTarget : null,
    }),
    [totalInv, surplus, savingsTarget]
  );

  const shortfallPoint = projection.find((p) => p.balance < 0);
  const showProjection = !(totalNet === 0 && totalInv === 0);

  return (
    <>
      <div className="g2 mb-5">
        {incomeCards.map(({ p, incomeKey, pctKey, gross, pct401k }) => (
          <div key={p.name} className="card" style={{ borderTop: `3px solid ${p.color}` }}>
            <div className="fw-700 text-md mb-3" style={{ color: p.color }}>{p.name} — Income</div>
            <div className="mono fw-700 mb-1" style={{ fontSize: 20 }}>
              {fmt(gross)}<span className="text-sm text-muted">/mo</span>
            </div>
            <div className="text-sm text-muted">
              Annual: {fmt(gross * 12)} · 401K: {pct401k}% = {fmt(gross * (pct401k / 100))}/mo
            </div>
            {editPlan && (
              <div className="col gap-3 mt-4">
                <input className="inp" type="number" placeholder="Gross monthly $" value={gross} onChange={(e) => setPlanData((p2) => ({ ...p2, [incomeKey]: +e.target.value }))} />
                <div className="row gap-3">
                  <label className="text-sm text-muted nowrap">401K %</label>
                  <input type="range" min={0} max={50} value={pct401k} className="flex-1" style={{ accentColor: p.color }} onChange={(e) => setPlanData((p2) => ({ ...p2, [pctKey]: +e.target.value }))} />
                  <span className="mono text-base" style={{ color: p.color, minWidth: 32 }}>{pct401k}%</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="g3 mb-5">
        {summaryStats.map((s) => (
          <div key={s.l} className="stat">
            <div className="row-between mb-3">
              <div className="text-xs text-muted fw-600 uppercase" style={{ letterSpacing: ".5px" }}>{s.l}</div>
              <div>{s.i}</div>
            </div>
            <div className="mono fw-700 text-2xl" style={{ color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div className="card mb-5">
        <div className="row-between mb-5">
          <div className="fw-600 text-lg">Investment Portfolio</div>
          <button className="btn s text-sm" onClick={() => setEditPlan((p) => !p)}>
            {editPlan ? "✅ Done" : "✏️ Edit"}
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 9 }}>
          {invItems.map((item) => (
            <div key={item.k} className="card-2-tile" style={{ padding: "11px 13px", borderLeft: `3px solid ${item.color}` }}>
              <div className="text-xs text-muted mb-1">{item.label}</div>
              {editPlan ? (
                <input className="inp" type="number" placeholder="Balance $" value={planData.investments[item.k] || ""} onChange={(e) => setPlanData((p) => ({ ...p, investments: { ...p.investments, [item.k]: +e.target.value } }))} />
              ) : (
                <div className="mono fw-700" style={{ fontSize: 17, color: item.color }}>{fmt(planData.investments[item.k] || 0)}</div>
              )}
            </div>
          ))}
        </div>

        {totalInv > 0 && (
          <div className="mt-5">
            <div role="img" aria-label="Pie chart showing investment portfolio allocation">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={invItems.filter((i) => (planData.investments[i.k] || 0) > 0).map((i) => ({ name: i.label, value: planData.investments[i.k], color: i.color }))}
                    dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                    label={({ name, percent }) => `${name.split(" ")[0]} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false} fontSize={9}
                  >
                    {invItems.filter((i) => (planData.investments[i.k] || 0) > 0).map((i) => <Cell key={i.k} fill={i.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div className="card mb-5">
        <div className="card-title">Annual Goals</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 10 }}>
          {annualGoals.map((g) => {
            const pp = Math.min(100, (g.current / g.goal) * 100);
            return (
              <div key={g.l} className="card-2-tile" style={{ padding: "13px 14px" }}>
                <div className="text-sm text-muted mb-2">{g.l} Goal</div>
                {editPlan ? (
                  <input className="inp mb-3" type="number" value={planData[g.key] || ""} onChange={(e) => setPlanData((p) => ({ ...p, [g.key]: +e.target.value }))} />
                ) : (
                  <div className="mono fw-700 mb-3" style={{ fontSize: 17, color: g.color }}>
                    {fmt(g.current)} <span className="text-sm text-muted">/ {fmt(g.goal)}</span>
                  </div>
                )}
                <div className="pb"><div className="pf" style={{ width: `${pp}%`, background: g.color }} /></div>
                <div className="row-between mt-2 text-xs text-muted">
                  <span>{pp.toFixed(0)}%</span>
                  <span>{pp >= 100 ? "✅ Reached!" : fmt(g.goal - g.current) + " to go"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card mb-5">
        <div className="card-title">Savings Goal Calculator</div>
        <div className="row gap-3 wrap mb-4">
          <div className="flex-1" style={{ minWidth: 180 }}>
            <label htmlFor="savings-target" className="text-sm text-muted mb-1 block">Savings Target</label>
            <input
              id="savings-target"
              className="inp" type="number" min="0" placeholder="$ amount"
              value={savingsTarget || ""}
              onChange={(e) => setSavingsTarget(+e.target.value)}
            />
          </div>
          <div className="flex-1" style={{ minWidth: 180 }}>
            <label htmlFor="timeline-months" className="text-sm text-muted mb-1 block">Timeline (months)</label>
            <input
              id="timeline-months"
              className="inp" type="number" min="1" placeholder="Months"
              value={timelineMonths || ""}
              onChange={(e) => setTimelineMonths(+e.target.value)}
            />
          </div>
        </div>

        {savingsTarget > 0 && timelineMonths > 0 ? (
          <>
            <div className="g3 mb-4">
              <div className="card-2-tile" style={{ padding: "10px 12px" }}>
                <div className="text-xs text-muted mb-1">Required / month</div>
                <div className="mono fw-700 text-xl" style={{ color: "#FFC312" }}>{fmt(goalPlan.requiredMonthly)}</div>
              </div>
              <div className="card-2-tile" style={{ padding: "10px 12px" }}>
                <div className="text-xs text-muted mb-1">Current surplus</div>
                <div className="mono fw-700 text-xl" style={{ color: surplus > 0 ? "#00B894" : "#FF6B6B" }}>
                  {fmt(surplus)}
                </div>
              </div>
              <div className="card-2-tile" style={{ padding: "10px 12px" }}>
                <div className="text-xs text-muted mb-1">Monthly gap</div>
                <div className="mono fw-700 text-xl" style={{ color: goalPlan.gap > 0 ? "#FF6B6B" : "#00B894" }}>
                  {fmt(goalPlan.gap)}
                </div>
              </div>
            </div>

            <div className="text-base">
              {goalPlan.status === "on-track" && (
                <span style={{ color: "#00B894" }}>
                  ✅ On track — current surplus covers the required savings rate.
                </span>
              )}
              {goalPlan.status === "short" && (
                <span style={{ color: "#FFC312" }}>
                  ⚠ Short by {fmt(goalPlan.gap)}/mo. Trim spending or extend the timeline to close the gap.
                </span>
              )}
              {goalPlan.status === "deficit" && (
                <span style={{ color: "#FF6B6B" }}>
                  🚨 Spending exceeds income — this goal is unreachable at the current pace.
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="text-sm text-muted">Enter a savings target and timeline to see your monthly plan.</div>
        )}
      </div>

      <div className="card">
        <div className="card-title">12-Month Projection</div>
        <div className="text-sm text-muted mb-4">
          Wealth trajectory if current spending of {fmt(avgMonthly)}/mo continues.
        </div>

        {shortfallPoint && (
          <div className="warn mb-4">
            ⚠️ <span>Projected balance falls below $0 by <strong>{shortfallPoint.month}</strong> if current spending continues.</span>
          </div>
        )}

        {showProjection ? (
          <div role="img" aria-label="Line chart showing 12-month wealth projection based on current spending">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={projection} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E3A56" />
                <XAxis dataKey="month" stroke="#6E90AE" fontSize={10} />
                <YAxis
                  stroke="#6E90AE" fontSize={10}
                  tickFormatter={(v) => "$" + (v / 1000).toFixed(0) + "k"}
                />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={tooltipStyle} />
                <Legend formatter={(v) => <span className="text-muted text-xs">{v}</span>} />
                {shortfallPoint && <ReferenceLine y={0} stroke="#EF4444" strokeDasharray="3 3" />}
                <Line
                  type="monotone" dataKey="balance" name="Projected balance"
                  stroke="#818CF8" strokeWidth={2.5} dot={{ fill: "#818CF8", r: 3 }}
                />
                {savingsTarget > 0 && (
                  <Line
                    type="monotone" dataKey="goal" name="Goal"
                    stroke="#FFC312" strokeWidth={2} strokeDasharray="5 4" dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center text-faint" style={{ padding: "20px 0" }}>
            Set your monthly income above to see a projection.
          </div>
        )}
      </div>
    </>
  );
}

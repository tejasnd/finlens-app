import { useCallback, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { CAT_COLORS, CATEGORY_CACHE_TTL_DAYS } from "../../constants";
import { fmt, pct } from "../../utils/formatters";
import { useAppContext } from "../../context/AppContext";
import { getCacheStats, clearCache, getCacheTimestamp } from "../../utils/categoryCache";

const tooltipStyle = { background: "var(--card-2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" };
const SOON_MS = (CATEGORY_CACHE_TTL_DAYS - 3) * 24 * 60 * 60 * 1000;

export default function CategoriesTab() {
  const { catTotals, filtered, totalSpend, notify } = useAppContext();

  const [stats, setStats] = useState(() => getCacheStats());

  const handleClear = useCallback(() => {
    clearCache();
    setStats(getCacheStats());
    notify?.("AI category cache cleared.", "success");
  }, [notify]);

  const hasCacheData = stats.total > 0;

  return (
    <div className="col-gap-12">
      {/* Cache stats panel */}
      <div className="card">
        <div className="row-between mb-3">
          <div className="fw-600 text-base">AI Category Cache</div>
          {hasCacheData && (
            <button className="btn s text-sm" onClick={handleClear}>
              Clear cache
            </button>
          )}
        </div>
        {hasCacheData ? (
          <div className="g3">
            <div className="card-2-tile" style={{ padding: "10px 12px" }}>
              <div className="text-xs text-muted mb-1">Cached entries</div>
              <div className="mono fw-700 text-xl">{stats.total}</div>
            </div>
            <div className="card-2-tile" style={{ padding: "10px 12px" }}>
              <div className="text-xs text-muted mb-1">Expiring soon</div>
              <div className="mono fw-700 text-xl" style={{ color: stats.expiringSoon > 0 ? "#FFC312" : "var(--text)" }}>
                {stats.expiringSoon}
              </div>
            </div>
            <div className="card-2-tile" style={{ padding: "10px 12px" }}>
              <div className="text-xs text-muted mb-1">Last updated</div>
              <div className="mono fw-700 text-sm">
                {stats.lastUpdated
                  ? stats.lastUpdated.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "—"}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted">No cached categories yet. Import and categorize transactions to populate the cache.</div>
        )}
        {stats.expiringSoon > 0 && (
          <div className="warn mt-3">
            ⏰ <span>{stats.expiringSoon} cached {stats.expiringSoon === 1 ? "entry" : "entries"} will expire within 3 days — re-categorizing will refresh them.</span>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">All Categories Ranked</div>
        <ResponsiveContainer width="100%" height={Math.max(260, catTotals.length * 32)}>
          <BarChart data={catTotals} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#1E3A56" horizontal={false} />
            <XAxis type="number" stroke="#6E90AE" fontSize={10} tickFormatter={(v) => "$" + (v / 1000).toFixed(0) + "k"} />
            <YAxis type="category" dataKey="name" stroke="#6E90AE" fontSize={10} width={125} />
            <Tooltip formatter={(v) => fmt(v)} contentStyle={tooltipStyle} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {catTotals.map((c) => <Cell key={c.name} fill={CAT_COLORS[c.name] || "#778CA3"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(195px,1fr))", gap: 11 }}>
        {catTotals.map((c) => {
          const txns = filtered.filter((t) => t.category === c.name);
          const count = txns.length;

          // Check if any transaction in this category has a cache entry expiring soon
          const expiringSoonCount = txns.filter((t) => {
            const ts = getCacheTimestamp(t.description);
            return ts !== null && Date.now() - ts > SOON_MS;
          }).length;

          return (
            <div key={c.name} className="card" style={{ borderLeft: `3px solid ${CAT_COLORS[c.name] || "#778CA3"}` }}>
              <div className="row-between mb-1">
                <div className="text-sm text-muted">{c.name}</div>
                {expiringSoonCount > 0 && (
                  <span
                    title={`${expiringSoonCount} cached ${expiringSoonCount === 1 ? "entry" : "entries"} expiring soon`}
                    style={{ fontSize: 13, cursor: "default" }}
                  >
                    ⏰
                  </span>
                )}
              </div>
              <div className="mono fw-700 mb-1" style={{ fontSize: 18, color: CAT_COLORS[c.name] || "#778CA3" }}>{fmt(c.value)}</div>
              <div className="text-xs text-faint mt-1">
                {count} txns · {pct(c.value, totalSpend)} of total
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

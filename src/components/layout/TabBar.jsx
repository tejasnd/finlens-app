import { TABS, CATEGORIES } from "../../constants";

export default function TabBar({
  tab, setTab, filterOwner, setFilterOwner, filterCat, setFilterCat,
  dateRange, setDateRange, search, setSearch, filtered, transactions,
  personA, personB, isEmpty,
}) {
  return (
    <div className="row gap-2 mb-6 wrap">
      <div className="tab-strip" role="tablist" aria-label="Main navigation">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`tab ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {!isEmpty && (
        <>
          <select className="inp w-auto" aria-label="Filter by person" value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)}>
            <option value="All">All People</option>
            <option>{personA.name}</option>
            <option>{personB.name}</option>
          </select>

          <select className="inp w-auto" aria-label="Filter by category" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            <option>All</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>

          <select className="inp w-auto" aria-label="Filter by date range" value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option value="All">All Time</option>
            <option value="1M">Last month</option>
            <option value="3M">Last 3 months</option>
            <option value="6M">Last 6 months</option>
            <option value="1Y">Last year</option>
          </select>

          {tab === "Transactions" && (
            <input
              className="inp"
              aria-label="Search transactions"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 160 }}
            />
          )}

          <div className="tab-count">
            {filtered.length} txns · {[...new Set(transactions.map((t) => t.source))].length} card(s)
          </div>
        </>
      )}
    </div>
  );
}

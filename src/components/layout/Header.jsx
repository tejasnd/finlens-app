import { exportToExcel } from "../../services/excelExport";
import { CATEGORIES } from "../../constants";
import { useAppContext } from "../../context/AppContext";

export default function Header() {
  const {
    tab, personA, personB, isSetup, isEmpty,
    customRules, splitPct, transactions,
    setShowRules, setShowSplitModal,
    filterOwner, setFilterOwner,
    filterCat, setFilterCat,
    dateRange, setDateRange,
    search, setSearch,
    filtered,
    notify,
  } = useAppContext();

  return (
    <div className="content-header">

      {/* Page title */}
      <div className="row gap-4 shrink-0">
        <h1 style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.2px" }}>{tab}</h1>
        {!isEmpty && (
          <span className="text-sm text-faint">
            {filtered.length.toLocaleString()} txns
          </span>
        )}
      </div>

      {/* Controls */}
      {!isEmpty && (
        <div className="row gap-2 wrap">
          <select className="inp w-auto" aria-label="Filter by person" value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)}>
            <option value="All">All People</option>
            {isSetup && <><option>{personA.name}</option><option>{personB.name}</option></>}
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
              style={{ width: 150 }}
            />
          )}

          <div className="vdivider" />

          <button className="btn s text-sm" onClick={() => setShowRules((p) => !p)}>
            Rules{customRules.length > 0 ? ` · ${customRules.length}` : ""}
          </button>
          <button className="btn s text-sm" onClick={() => setShowSplitModal(true)}>
            Split {splitPct.A}/{splitPct.B}
          </button>
          <button className="btn s text-sm" onClick={() => {
            try {
              exportToExcel(transactions, splitPct, personA, personB);
              notify("Export complete.", "success");
            } catch (e) {
              notify("Export failed: " + e.message, "error");
            }
          }}>
            Export
          </button>
        </div>
      )}

    </div>
  );
}

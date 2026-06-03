import { CATEGORIES, CAT_COLORS, TX_PER_PAGE } from "../../constants";
import { fmt } from "../../utils/formatters";
import { exportToExcel } from "../../services/excelExport";
import ConfirmButton from "../layout/ConfirmButton";
import { useAppContext } from "../../context/AppContext";

export default function TransactionsTab() {
  const {
    filtered, transactions, splitPct, personA, personB,
    editId, setEditId, sortConfig, handleSort, txPage, setTxPage,
    updateCategory, updateSplitType, deleteTransaction,
  } = useAppContext();
  const totalPages = Math.ceil(filtered.length / TX_PER_PAGE);
  const pageSlice = filtered.slice((txPage - 1) * TX_PER_PAGE, txPage * TX_PER_PAGE);

  const columns = [
    { label: "Date",        key: "date" },
    { label: "Description", key: "description" },
    { label: "Paid By",     key: "owner" },
    { label: "Amount",      key: "amount" },
    { label: "Category",    key: "category" },
    { label: "Split",       key: "splitType" },
    { label: "",            key: null },
  ];

  return (
    <div className="card overflow-x">
      <div className="row-between mb-5">
        <div className="fw-600 text-lg">All Transactions</div>
        <div className="row gap-3">
          <div className="text-sm text-muted">{filtered.length} results</div>
          <button className="btn g" style={{ padding: "5px 12px", fontSize: 11 }} onClick={() => exportToExcel(transactions, splitPct, personA, personB)}>
            ⬇️ Export
          </button>
        </div>
      </div>

      <table className="tbl">
        <thead>
          <tr className="tbl-row">
            {columns.map(({ label, key }) => {
              const isSorted = key && sortConfig.key === key;
              const ariaSort = !key ? undefined : isSorted ? (sortConfig.direction === "asc" ? "ascending" : "descending") : "none";
              return (
                <th
                  key={label || "action"}
                  className="th"
                  style={{ textAlign: label === "Amount" ? "right" : "left", cursor: key ? "pointer" : "default" }}
                  aria-sort={ariaSort}
                  tabIndex={key ? 0 : undefined}
                  onClick={() => key && handleSort(key)}
                  onKeyDown={(e) => key && (e.key === "Enter" || e.key === " ") && handleSort(key)}
                >
                  {label}{isSorted ? (sortConfig.direction === "asc" ? " ↑" : " ↓") : ""}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {pageSlice.map((t) => (
            <tr key={t.id} className="tr tbl-row">
              <td className="td text-muted text-sm nowrap">
                {t.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
              </td>
              <td className="td truncate" style={{ maxWidth: 200 }}>
                {t.description || "—"}
              </td>
              <td className="td">
                <span className="badge" style={{ background: (t.owner === personA.name ? personA.color : personB.color) + "22", color: t.owner === personA.name ? personA.color : personB.color, fontSize: 10 }}>
                  {t.owner || "?"}
                </span>
              </td>
              <td className="mono td-r fw-700 text-rose text-base">
                {fmt(t.amount)}
              </td>
              <td className="td">
                {editId === t.id ? (
                  <select
                    className="inp text-sm"
                    defaultValue={t.category}
                    aria-label={`Category for ${t.description}`}
                    autoFocus
                    onChange={(e) => updateCategory(t.id, e.target.value)}
                    onBlur={() => setEditId(null)}
                  >
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                ) : (
                  <span
                    className="badge"
                    role="button"
                    tabIndex={0}
                    aria-label={`Category: ${t.category}. Click to edit.`}
                    style={{ background: (CAT_COLORS[t.category] || "#778CA3") + "22", color: CAT_COLORS[t.category] || "#778CA3", cursor: "pointer", fontSize: 10 }}
                    onClick={() => setEditId(t.id)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setEditId(t.id)}
                  >
                    {t.category}
                  </span>
                )}
              </td>
              <td className="td">
                <select
                  className="inp w-auto"
                  aria-label={`Split type for ${t.description}`}
                  value={t.splitType || "personal"}
                  onChange={(e) => updateSplitType(t.id, e.target.value)}
                  style={{ fontSize: 10, padding: "2px 5px" }}
                >
                  <option value="personal">Personal</option>
                  <option value="shared">Shared</option>
                </select>
              </td>
              <td className="td row gap-2">
                <button
                  aria-label={`Edit category for ${t.description}`}
                  onClick={() => setEditId(t.id)}
                  className="icon-btn"
                >
                  ✏️
                </button>
                <ConfirmButton onConfirm={() => deleteTransaction(t.id)} label="Delete?">
                  <button aria-label={`Delete transaction: ${t.description}`} className="icon-btn">🗑️</button>
                </ConfirmButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn s text-sm" disabled={txPage === 1} onClick={() => setTxPage((p) => p - 1)}>← Prev</button>
          <span className="text-sm text-muted">Page {txPage} of {totalPages} · {filtered.length} total</span>
          <button className="btn s text-sm" disabled={txPage === totalPages} onClick={() => setTxPage((p) => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}

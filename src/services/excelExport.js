import * as XLSX from "xlsx";
import { MONTHS } from "../constants";
import { pct } from "../utils/formatters";

export function exportToExcel(transactions, splitPct, personA, personB) {
  const exportable = transactions.filter((t) => t.amount > 0 && t.category !== "Finance & Fees");
  const total = exportable.reduce((s, t) => s + t.amount, 0);

  const txnRows = [
    ["Date", "Description", "Source", "Owner", "Amount ($)", "Category", "Split Type"],
    ...exportable.map((t) => [
      t.date.toLocaleDateString("en-US"),
      t.description,
      t.source,
      t.owner,
      t.amount,
      t.category,
      t.splitType,
    ]),
  ];

  const catMap = {};
  exportable.forEach((t) => {
    catMap[t.category] = (catMap[t.category] || 0) + t.amount;
  });
  const catRows = [
    ["Category", "Total ($)", "% of Total"],
    ...Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .map(([c, v]) => [c, v, pct(v, total)]),
  ];

  const monthMap = {};
  exportable.forEach((t) => {
    const k = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}`;
    const label = `${MONTHS[t.date.getMonth()]} ${t.date.getFullYear()}`;
    if (!monthMap[k]) monthMap[k] = { label, total: 0, a: 0, b: 0 };
    monthMap[k].total += t.amount;
    if (t.owner === personA.name) monthMap[k].a += t.amount;
    if (t.owner === personB.name) monthMap[k].b += t.amount;
  });
  const monthRows = [
    ["Month", "Total ($)", `${personA.name} ($)`, `${personB.name} ($)`],
    ...Object.entries(monthMap)
      .sort()
      .map(([, v]) => [v.label, v.total, v.a, v.b]),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(txnRows), "Transactions");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(catRows), "By Category");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(monthRows), "By Month");
  try {
    XLSX.writeFile(wb, "FinLens_Export.xlsx");
  } catch (cause) {
    const err = new Error(`Export failed: ${cause.message || "could not write file"}`);
    err.code = "EXPORT_ERROR";
    throw err;
  }
}

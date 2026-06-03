import * as XLSX from "xlsx";
import { guessColumns, parseDate } from "../utils/parsers";
import { smartCategory } from "../utils/categorization";
import { SHARED_CATS } from "../constants";

const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

// Stable fingerprint derived from file identity, not upload time.
// Same physical file re-uploaded → same fingerprint → deduplication works.
// Different file with same name → different size/lastModified → no collision.
function fileFingerprint(file) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export function parseFile(file, owner) {
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    const err = new Error(`"${file.name}" is not supported. Please upload a .xlsx, .xls, or .csv file.`);
    err.code = "PARSE_ERROR";
    err.fileName = file.name;
    return Promise.reject(err);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array", cellDates: false });
        const all = [];

        wb.SheetNames.forEach((sn) => {
          const ws = wb.Sheets[sn];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
          if (rows.length < 2) return;

          let hdrIdx = rows.findIndex((r) => r.filter((c) => String(c).trim()).length >= 3);
          if (hdrIdx < 0) hdrIdx = 0;

          const headers = rows[hdrIdx].map(String);
          const cols = guessColumns(headers);
          if (!cols.amount) return;

          const amtIdx = headers.indexOf(cols.amount);
          const descIdx = cols.desc ? headers.indexOf(cols.desc) : -1;
          const dataRows = rows.slice(hdrIdx + 1);

          const rawAmts = dataRows.map((r) => {
            const v = r[amtIdx];
            if (v == null || v === "") return null;
            const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
            return isNaN(n) ? null : n;
          });

          // Detect Chase-style where expenses are stored as negative values
          const nonPaymentRaw = rawAmts.filter((a, i) => {
            if (a === null || a === 0) return false;
            const desc = descIdx >= 0 ? String(dataRows[i][descIdx] || "").toLowerCase() : "";
            return !/payment|thank you|mobile pmt|directdep|refund|cashback/i.test(desc);
          });
          const isInverted =
            nonPaymentRaw.length > 0 &&
            nonPaymentRaw.filter((a) => a < 0).length > nonPaymentRaw.length / 2;

          dataRows.forEach((row, ri) => {
            try {
              const raw = rawAmts[ri];
              if (raw === null || raw === 0) return;

              let amount = isInverted ? -raw : Math.abs(raw);
              const desc = descIdx >= 0 ? String(row[descIdx] ?? "").trim() : "";
              const isCreditOrPayment =
                /payment|thank you|mobile pmt|directdep|redemption|refund|cashback/i.test(desc);
              if (isCreditOrPayment && amount > 0) amount = -amount;
              if (amount === 0) return;

              const isPayment = /payment|thank you|mobile pmt|directdep/i.test(desc);
              const cat = isPayment ? "Finance & Fees" : smartCategory(desc);
              const date = parseDate(cols.date ? row[headers.indexOf(cols.date)] : null);

              all.push({
                id: `${fileFingerprint(file)}-${sn}-${ri}`,
                source: file.name,
                owner,
                date: date || new Date(),
                amount,
                description: desc,
                category: cat,
                splitType: SHARED_CATS.includes(cat) ? "shared" : "personal",
              });
            } catch (rowErr) {
              const humanRow = hdrIdx + 1 + ri + 2; // 1-based, account for header rows
              const enriched = new Error(
                `Failed to parse row ${humanRow} in sheet "${sn}" of "${file.name}": ${rowErr.message}`
              );
              enriched.code = "PARSE_ERROR";
              enriched.fileName = file.name;
              enriched.sheet = sn;
              enriched.row = humanRow;
              throw enriched;
            }
          });
        });

        resolve(all);
      } catch (err) {
        if (err.code === "PARSE_ERROR") {
          reject(err);
          return;
        }
        const enriched = new Error(`Failed to parse "${file.name}": ${err.message || "unknown error"}`);
        enriched.code = "PARSE_ERROR";
        enriched.fileName = file.name;
        reject(enriched);
      }
    };
    reader.onerror = () => {
      const err = new Error(`Could not read file "${file.name}". The file may be corrupted or inaccessible.`);
      err.code = "FILE_READ_ERROR";
      err.fileName = file.name;
      reject(err);
    };
    reader.readAsArrayBuffer(file);
  });
}

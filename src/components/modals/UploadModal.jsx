import { useState } from "react";
import { useModalBehavior } from "../../hooks/useModalBehavior";
import { useAppContext } from "../../context/AppContext";
import { fetchGmailBills } from "../../services/gmailBills";
import { fmt } from "../../utils/formatters";

export default function UploadModal() {
  const {
    personA, personB, uploadOwner, setUploadOwner, openFilePicker, setShowUploadModal,
    loading, aiProgress, setAiProgress, cancelAI, importGmailBills,
  } = useAppContext();
  const onClose = () => setShowUploadModal(false);
  const isAIRunning = aiProgress?.phase === "running";
  const isAIDone = aiProgress?.phase === "done";
  const pct = aiProgress?.total > 0
    ? Math.round((aiProgress.done / aiProgress.total) * 100)
    : 0;

  // ── Gmail bill discovery / selection ──────────────────────────────────────
  const [gPhase, setGPhase] = useState("idle"); // idle | loading | list | error
  const [gBills, setGBills] = useState([]);
  const [gErr, setGErr] = useState("");
  const [gSel, setGSel] = useState(() => new Set());

  async function discoverBills() {
    setGPhase("loading");
    setGErr("");
    try {
      const bills = await fetchGmailBills("1m", 25);
      setGBills(bills);
      // Preselect the ones that clearly look like statements.
      setGSel(new Set(bills.filter((b) => b.likely_bill).map((b) => b.id)));
      setGPhase("list");
    } catch (e) {
      setGErr(e.message || "Couldn't reach Gmail.");
      setGPhase("error");
    }
  }

  function toggleBill(id) {
    setGSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function retrieveSelected() {
    const chosen = gBills.filter((b) => gSel.has(b.id));
    if (!chosen.length) return;
    importGmailBills(chosen, uploadOwner);
    onClose();
  }

  const { containerRef, backdropProps } = useModalBehavior(onClose, { disabled: isAIRunning || loading });

  return (
    <div className="modal-bg" {...backdropProps}>
      <div
        className="modal"
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Upload Statement"
      >
        <div className="fw-700 mb-1" style={{ fontSize: 16 }}>Upload Statement</div>
        <div className="text-muted text-base mb-2 mt-1">
          Works with any bank or card — CSV or Excel. Format is auto-detected.
        </div>
        <div className="text-muted text-base mb-5">
          Whose statement are you uploading?
        </div>

        <div className="g2 mb-5" role="radiogroup" aria-label="Select statement owner">
          {[personA, personB].map((p) => (
            <div
              key={p.name}
              role="radio"
              aria-checked={uploadOwner === p.name}
              tabIndex={loading ? -1 : 0}
              className={`dz${uploadOwner === p.name ? " active" : ""}`}
              style={{
                borderColor: uploadOwner === p.name ? p.color : undefined,
                background: uploadOwner === p.name ? `${p.color}18` : undefined,
                opacity: loading ? 0.5 : 1,
                pointerEvents: loading ? "none" : "auto",
                cursor: loading ? "default" : "pointer",
              }}
              onClick={() => !loading && setUploadOwner(p.name)}
              onKeyDown={(e) => !loading && (e.key === "Enter" || e.key === " ") && setUploadOwner(p.name)}
            >
              <div className="modal-avatar" style={{ background: p.color }}>
                {p.short}
              </div>
              <div className="fw-600 text-lg" style={{ color: uploadOwner === p.name ? p.color : "var(--text-2)" }}>
                {p.name}
              </div>
            </div>
          ))}
        </div>

        {/* AI progress bar */}
        {aiProgress && (
          <div className="ai-progress-box">
            {isAIRunning && (
              <>
                <div className="row-between mb-3">
                  <span className="text-base text-muted fw-500">
                    Categorizing {aiProgress.done} / {aiProgress.total} transactions…
                  </span>
                  <span className="text-xs text-faint">{pct}%</span>
                </div>
                <div className="ai-progress-bar-track">
                  <div className="ai-progress-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <button className="btn s text-sm w-full" onClick={cancelAI}>
                  Cancel AI categorization
                </button>
              </>
            )}

            {isAIDone && (
              <div className="row gap-4">
                <div className="flex-1">
                  <span className="text-base fw-600" style={{ color: "#166534" }}>
                    ✓ {aiProgress.categorized} transaction{aiProgress.categorized !== 1 ? "s" : ""} categorized
                  </span>
                  {aiProgress.skipped > 0 && (
                    <span className="text-sm text-faint" style={{ marginLeft: 8 }}>
                      · {aiProgress.skipped} still uncategorized
                    </span>
                  )}
                </div>
                <button
                  className="icon-btn"
                  style={{ fontSize: 13 }}
                  onClick={() => setAiProgress(null)}
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )}

        <div className="row gap-3">
          <button
            className="btn p flex-1"
            disabled={loading || isAIRunning}
            onClick={() => openFilePicker(uploadOwner)}
          >
            {loading ? "Parsing…" : "Select Files"}
          </button>
          <button className="btn s" aria-label="Close" onClick={onClose} disabled={isAIRunning}>
            {isAIDone ? "Done" : "Cancel"}
          </button>
        </div>

        {/* ── Gmail bill import ──────────────────────────────────────────── */}
        <div className="divider" style={{ margin: "16px 0 12px" }} />

        {gPhase !== "list" && (
          <>
            <button
              className="btn s w-full"
              disabled={loading || isAIRunning || gPhase === "loading"}
              onClick={discoverBills}
            >
              {gPhase === "loading" ? "Checking Gmail…" : "📧 Find recent statements in Gmail"}
            </button>
            <div className="text-xs text-faint lh-15 mt-2">
              Scans the last 30 days for credit-card statements and lets you pick which to import as
              bill records (issuer, balance, due date). These are summaries — for individual
              transactions, upload the CSV/Excel export above.
            </div>
            {gPhase === "error" && (
              <div className="text-xs mt-2" style={{ color: "var(--rose, #e17055)" }}>{gErr}</div>
            )}
          </>
        )}

        {gPhase === "list" && (
          <div>
            <div className="row-between mb-2">
              <span className="fw-600 text-sm">
                {gBills.length
                  ? `${gBills.length} recent statement${gBills.length !== 1 ? "s" : ""} found`
                  : "No statements found in the last 30 days"}
              </span>
              <button className="btn s" style={{ fontSize: 11 }} onClick={() => setGPhase("idle")}>
                Back
              </button>
            </div>

            {gBills.length > 0 && (
              <>
                <div className="text-xs text-faint mb-2">
                  Imported as bill summaries for <strong>{uploadOwner}</strong> (category “Finance &amp; Fees”).
                </div>
                <div className="col gap-2" style={{ maxHeight: 230, overflowY: "auto" }}>
                  {gBills.map((b) => {
                    const checked = gSel.has(b.id);
                    const bal = b.parsed?.statement_balance ?? b.parsed?.minimum_due;
                    return (
                      <label
                        key={b.id}
                        className="surface-tile"
                        style={{ padding: "8px 11px", display: "flex", gap: 9, alignItems: "flex-start", cursor: "pointer" }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleBill(b.id)}
                          style={{ marginTop: 3, flexShrink: 0 }}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="row-between" style={{ gap: 8 }}>
                            <span className="text-sm fw-600 truncate" style={{ flex: 1 }}>
                              {b.subject || "(no subject)"}
                            </span>
                            {bal != null && (
                              <span className="mono text-sm fw-700" style={{ flexShrink: 0 }}>{fmt(bal)}</span>
                            )}
                          </div>
                          <div className="text-xs text-faint truncate">
                            {b.sender}
                            {b.parsed?.due_date ? ` · due ${b.parsed.due_date}` : ""}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <button
                  className="btn p w-full mt-3"
                  disabled={gSel.size === 0}
                  onClick={retrieveSelected}
                >
                  Retrieve {gSel.size} bill{gSel.size !== 1 ? "s" : ""}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

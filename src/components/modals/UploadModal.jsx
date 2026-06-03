import { useModalBehavior } from "../../hooks/useModalBehavior";
import { useAppContext } from "../../context/AppContext";

export default function UploadModal() {
  const {
    personA, personB, uploadOwner, setUploadOwner, openFilePicker, setShowUploadModal,
    loading, aiProgress, setAiProgress, cancelAI,
  } = useAppContext();
  const onClose = () => setShowUploadModal(false);
  const isAIRunning = aiProgress?.phase === "running";
  const isAIDone = aiProgress?.phase === "done";
  const pct = aiProgress?.total > 0
    ? Math.round((aiProgress.done / aiProgress.total) * 100)
    : 0;

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
      </div>
    </div>
  );
}

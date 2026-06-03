import { useState } from "react";
import { useModalBehavior } from "../../hooks/useModalBehavior";
import { useAppContext } from "../../context/AppContext";

export default function SplitModal() {
  const { personA, personB, splitPct, setSplitPct, setShowSplitModal } = useAppContext();
  const onClose = () => setShowSplitModal(false);
  const [draft, setDraft] = useState({ A: String(splitPct.A), B: String(splitPct.B) });

  const parsed = { A: parseFloat(draft.A), B: parseFloat(draft.B) };
  const aValid = !isNaN(parsed.A) && parsed.A >= 0 && parsed.A <= 100;
  const bValid = !isNaN(parsed.B) && parsed.B >= 0 && parsed.B <= 100;
  const sumValid = aValid && bValid && Math.round(parsed.A + parsed.B) === 100;
  const canSave = aValid && bValid && sumValid;

  const error = !aValid || !bValid
    ? "Each value must be between 0 and 100."
    : !sumValid
    ? `Values must sum to 100 (currently ${isNaN(parsed.A + parsed.B) ? "—" : Math.round(parsed.A + parsed.B)}).`
    : null;

  const handleChange = (key, raw) => {
    const other = key === "A" ? "B" : "A";
    const n = parseFloat(raw);
    const complement = !isNaN(n) && n >= 0 && n <= 100 ? String(100 - n) : draft[other];
    setDraft({ ...draft, [key]: raw, [other]: complement });
  };

  const handleSave = () => {
    if (!canSave) return;
    setSplitPct({ A: parsed.A, B: parsed.B });
    onClose();
  };

  const { containerRef, backdropProps } = useModalBehavior(onClose);

  return (
    <div className="modal-bg" {...backdropProps}>
      <div
        className="modal"
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Shared Expense Split"
      >
        <div className="fw-700 mb-1" style={{ fontSize: 16 }}>Shared Expense Split</div>
        <div className="text-muted text-md mb-5 lh-15">
          Set what % each person owes for shared expenses (rent, utilities, groceries…)
        </div>

        {[{ p: personA, k: "A" }, { p: personB, k: "B" }].map(({ p, k }) => (
          <div key={k} className="mb-4">
            <div className="row-between mb-3">
              <label htmlFor={`split-pct-${k}`} className="text-md fw-600" style={{ color: p.color }}>{p.name}</label>
              <input
                id={`split-pct-${k}`}
                type="number"
                min={0}
                max={100}
                value={draft[k]}
                onChange={(e) => handleChange(k, e.target.value)}
                className="split-input"
                style={{
                  color: p.color,
                  border: `1px solid ${(k === "A" ? !aValid : !bValid) ? "var(--danger, #e55)" : "var(--border)"}`,
                }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={100}
              aria-label={`${p.name} split percentage`}
              value={isNaN(parsed[k]) ? 0 : Math.min(100, Math.max(0, parsed[k]))}
              className="w-full"
              style={{ accentColor: p.color }}
              onChange={(e) => handleChange(k, e.target.value)}
            />
          </div>
        ))}

        {error && (
          <div className="text-base mb-5" style={{ color: "var(--danger, #e55)" }}>
            {error}
          </div>
        )}

        <div className="split-summary">
          Shared expenses:{" "}
          <strong style={{ color: personA.color }}>{personA.name} {canSave ? parsed.A : "—"}%</strong>
          {" · "}
          <strong style={{ color: personB.color }}>{personB.name} {canSave ? parsed.B : "—"}%</strong>
        </div>

        <button
          className="btn p w-full"
          disabled={!canSave}
          onClick={handleSave}
        >
          Save Split
        </button>
      </div>
    </div>
  );
}

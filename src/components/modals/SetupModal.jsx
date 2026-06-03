import { useModalBehavior } from "../../hooks/useModalBehavior";
import { useAppContext } from "../../context/AppContext";

export default function SetupModal() {
  const { isSetup, draftNames, setDraftNames, completeSetup, setShowSetupModal } = useAppContext();
  const onCancel = () => setShowSetupModal(false);
  const onClose = isSetup ? onCancel : undefined;
  const { containerRef, backdropProps } = useModalBehavior(onClose ?? (() => {}), { disabled: !isSetup });

  return (
    <div className="modal-bg" {...backdropProps}>
      <div
        className="modal"
        style={{ maxWidth: 460 }}
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isSetup ? "Edit Names" : "Welcome to FinLens"}
      >
        <div className="text-center mb-5">
          <div className="modal-logo-icon">FL</div>
          <div className="fw-700 text-2xl mb-2">
            {isSetup ? "Edit Names" : "Welcome to FinLens"}
          </div>
          <div className="text-muted text-md lh-15">
            {isSetup
              ? "Update the names below."
              : "Your private couple finance tracker. Runs entirely in your browser — nothing leaves your device."}
          </div>
        </div>

        <div className="col gap-5 mb-5">
          {[
            { k: "A", label: "Partner 1", color: "#FF6B9D" },
            { k: "B", label: "Partner 2", color: "#7C8CF8" },
          ].map(({ k, label, color }) => (
            <div key={k}>
              <label className="form-label">{label}</label>
              <input
                className="inp w-full"
                style={{ borderColor: draftNames[k] ? color : undefined }}
                placeholder="e.g. Alex"
                value={draftNames[k]}
                onChange={(e) => setDraftNames((p) => ({ ...p, [k]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && completeSetup()}
              />
            </div>
          ))}
        </div>

        <div className="row gap-3">
          <button
            className="btn p flex-1"
            style={{ fontSize: 13, padding: "10px 14px" }}
            onClick={completeSetup}
            disabled={!draftNames.A.trim() || !draftNames.B.trim()}
          >
            {isSetup ? "Save Changes" : "Get Started →"}
          </button>
          {isSetup && (
            <button className="btn s" aria-label="Close" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

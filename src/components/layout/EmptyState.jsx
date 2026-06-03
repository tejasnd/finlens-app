import { useAppContext } from "../../context/AppContext";

export default function EmptyState() {
  const { personA, personB, isSetup, loading, handleDrop, setUploadOwner, setShowUploadModal } = useAppContext();

  return (
    <div style={{ maxWidth: 560, margin: "48px auto 0" }}>
      <div className="text-center mb-7">
        <h2 className="fw-600 mb-2" style={{ fontSize: 20, letterSpacing: "-0.4px" }}>
          {isSetup ? `Import ${personA.name} & ${personB.name}'s statements` : "Import your statements"}
        </h2>
        <p className="text-muted text-md lh-15">
          Upload CSV or Excel exports from any bank or credit card. Format is detected automatically.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isSetup ? "1fr 1fr" : "1fr", gap: 10, marginBottom: 16 }}>
        {(isSetup ? [personA, personB] : [personA]).map((p) => (
          <div
            key={p.name || "default"}
            className="dz"
            onDrop={(e) => handleDrop(e, p.name)}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => { setUploadOwner(p.name); setShowUploadModal(true); }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: p.color || "#6366F1",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, color: "#fff",
              margin: "0 auto 10px",
            }}>
              {p.short || "?"}
            </div>
            <div className="fw-500 text-md mb-1">
              {isSetup ? `${p.name}'s cards` : "Drop files here"}
            </div>
            <div className="text-muted text-sm">.xlsx · .xls · .csv</div>
          </div>
        ))}
      </div>

      {loading && (
        <p className="text-center text-base" style={{ color: "#6366F1" }}>Parsing files…</p>
      )}

      <p className="text-center text-faint text-sm mt-5">
        Nothing leaves your browser · no account needed
      </p>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";

// Renders a trigger element. On first click, replaces it with inline
// "label? Yes / Cancel" buttons. Auto-cancels after `timeout` ms.
//
// Props:
//   onConfirm   — called when the user clicks "Yes"
//   label       — text shown on the confirmation prompt (default "Delete?")
//   timeout     — ms before auto-cancel (default 5000)
//   children    — the trigger element (button, icon button, etc.)
export default function ConfirmButton({
  onConfirm,
  label = "Delete?",
  timeout = 5000,
  children,
}) {
  const [pending, setPending] = useState(false);
  const timerRef = useRef(null);

  const arm = (e) => {
    e.stopPropagation();
    setPending(true);
    timerRef.current = setTimeout(() => setPending(false), timeout);
  };

  const confirm = (e) => {
    e.stopPropagation();
    clearTimeout(timerRef.current);
    setPending(false);
    onConfirm();
  };

  const cancel = (e) => {
    e.stopPropagation();
    clearTimeout(timerRef.current);
    setPending(false);
  };

  // Clean up timer if component unmounts while pending
  useEffect(() => () => clearTimeout(timerRef.current), []);

  if (!pending) {
    return (
      <span onClick={arm} style={{ display: "inline-flex" }}>
        {children}
      </span>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: 11, color: "var(--text-2)", whiteSpace: "nowrap" }}>{label}</span>
      <button
        autoFocus
        onClick={confirm}
        style={{
          background: "#EF4444",
          color: "#fff",
          border: "none",
          borderRadius: 5,
          fontSize: 11,
          fontWeight: 600,
          padding: "2px 8px",
          cursor: "pointer",
          lineHeight: 1.5,
        }}
      >
        Yes
      </button>
      <button
        onClick={cancel}
        style={{
          background: "var(--card-2)",
          color: "var(--text-2)",
          border: "1px solid var(--border)",
          borderRadius: 5,
          fontSize: 11,
          padding: "2px 8px",
          cursor: "pointer",
          lineHeight: 1.5,
        }}
      >
        No
      </button>
    </span>
  );
}

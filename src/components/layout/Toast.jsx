import { useEffect, useState } from "react";

const COLORS = {
  error:   { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B", icon: "✕" },
  success: { bg: "#F0FDF4", border: "#BBF7D0", text: "#166534", icon: "✓" },
  info:    { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF", icon: "ℹ" },
};

export function Toast({ message, type = "info", onDismiss }) {
  const [visible, setVisible] = useState(true);
  const c = COLORS[type] ?? COLORS.info;

  useEffect(() => {
    const hide = setTimeout(() => setVisible(false), 4000);
    const remove = setTimeout(onDismiss, 4400);
    return () => { clearTimeout(hide); clearTimeout(remove); };
  }, [onDismiss]);

  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      padding: "11px 14px",
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: 10,
      boxShadow: "0 4px 16px rgba(0,0,0,.10)",
      maxWidth: 360,
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(8px)",
      transition: "opacity 0.35s ease, transform 0.35s ease",
      pointerEvents: visible ? "auto" : "none",
    }}>
      <span style={{ fontWeight: 700, fontSize: 13, color: c.text, flexShrink: 0, marginTop: 1 }}>
        {c.icon}
      </span>
      <span style={{ fontSize: 13, color: c.text, lineHeight: 1.5, flex: 1 }}>
        {message}
      </span>
      <button
        onClick={() => { setVisible(false); setTimeout(onDismiss, 350); }}
        style={{ background: "none", border: "none", cursor: "pointer", color: c.text, opacity: 0.5, fontSize: 13, padding: 0, flexShrink: 0 }}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div style={{
      position: "fixed",
      bottom: 24,
      right: 24,
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}>
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

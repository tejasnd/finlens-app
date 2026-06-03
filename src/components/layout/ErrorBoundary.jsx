import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    const { tab, children } = this.props;

    if (!error) return children;

    return (
      <div style={{
        padding: "40px 28px",
        maxWidth: 560,
      }}>
        <div style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "28px 28px 24px",
        }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>⚠️</div>
          {tab && (
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-3)", marginBottom: 6 }}>
              {tab} tab
            </div>
          )}
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8, color: "var(--text)" }}>
            Something went wrong
          </div>
          <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 16, lineHeight: 1.6 }}>
            This tab crashed unexpectedly. Your data is safe — it is stored in localStorage and was not affected.
          </div>
          <pre style={{
            background: "var(--card-2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 11,
            color: "var(--text-2)",
            overflowX: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            marginBottom: 20,
          }}>
            {error.message}
          </pre>
          <button
            className="btn p"
            onClick={() => window.location.reload()}
          >
            Reload app
          </button>
        </div>
      </div>
    );
  }
}

import { useState, useCallback, useEffect, useRef } from "react";
import { PROVIDERS, getAIConfig, setAIConfig, getProviderModel, setProviderModel } from "../../services/aiCategorizerService";
import { useAppContext } from "../../context/AppContext";
import ConfirmButton from "./ConfirmButton";

const BACKEND = "http://localhost:8000";

function Spinner() {
  return <span className="spinner" />;
}

function ApiKeyWarning({ provider }) {
  const destination = {
    github: "GitHub (api.github.com)",
    claude: "Anthropic (api.anthropic.com)",
    openai: "OpenAI (api.openai.com)",
    gemini: "Google (generativelanguage.googleapis.com)",
  }[provider];

  return (
    <div className="api-key-warning">
      <strong style={{ display: "block", marginBottom: 2 }}>Key stored in localStorage</strong>
      This key is saved in your browser only — this app never sends it to any server it operates.
      It is sent directly to <strong>{destination}</strong> only when you use the relevant feature.
      Anyone with access to your browser's dev tools can read it.{" "}
      <span style={{ opacity: 0.85 }}>Use a key with minimal permissions and revoke it when not in use.</span>
    </div>
  );
}

const PROVIDER_ICONS = { claude: "✦", openai: "◎", gemini: "◈" };

function GmailSection() {
  const [status, setStatus] = useState(null); // { hasCredentials, hasToken }
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");
  const fileRef = useRef(null);
  const [bills, setBills] = useState(null); // null = not searched yet; [] = none found
  const [billsLoading, setBillsLoading] = useState(false);
  const [billsError, setBillsError] = useState("");
  const [authorizing, setAuthorizing] = useState(false);
  const [authError, setAuthError] = useState("");

  const handleAuthorize = async () => {
    setAuthorizing(true);
    setAuthError("");
    try {
      const r = await fetch(`${BACKEND}/api/gmail/authorize`, { method: "POST" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setAuthError(data.detail || "Authorization failed."); return; }
      fetchStatus();
    } catch {
      setAuthError("Backend unreachable — is the server running?");
    } finally {
      setAuthorizing(false);
    }
  };

  const searchBills = async () => {
    setBillsLoading(true);
    setBillsError("");
    setBills(null);
    try {
      const r = await fetch(`${BACKEND}/api/gmail/bills?max_results=10`);
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setBillsError(data.detail || `Search failed (${r.status}).`); return; }
      setBills(data.bills || []);
    } catch {
      setBillsError("Backend unreachable — is the server running?");
    } finally {
      setBillsLoading(false);
    }
  };

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch(`${BACKEND}/api/gmail/status`);
      if (r.ok) setStatus(await r.json());
    } catch { /* backend offline */ }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setText(ev.target.result); setError(""); };
    reader.readAsText(f);
  };

  const handleSave = async () => {
    setError("");
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      setError("Invalid JSON — paste the full contents of credentials.json.");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`${BACKEND}/api/gmail/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentials: parsed }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.detail || "Failed to save."); return; }
      setFlash("Saved ✓");
      setText("");
      setTimeout(() => setFlash(""), 2000);
      fetchStatus();
    } catch {
      setError("Backend unreachable — is the server running?");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    await fetch(`${BACKEND}/api/gmail/credentials`, { method: "DELETE" });
    fetchStatus();
  };

  return (
    <>
      <div className="panel-section-label">Gmail MCP</div>
      <div className="text-xs text-faint lh-15 mb-3">
        Enables the <strong>gmail-bills-mcp</strong> server to search your inbox for credit-card statements.
        Credentials stay on your machine — the OAuth flow runs entirely locally (loopback).
      </div>

      {status && (
        <div className="row gap-3 mb-3" style={{ flexWrap: "wrap" }}>
          <span style={{
            fontSize: 11, borderRadius: 4, padding: "2px 7px",
            background: status.hasCredentials ? "rgba(0,184,148,.15)" : "rgba(255,107,107,.12)",
            color: status.hasCredentials ? "#00B894" : "#e17055",
          }}>
            {status.hasCredentials ? "credentials.json saved" : "No credentials"}
          </span>
          <span style={{
            fontSize: 11, borderRadius: 4, padding: "2px 7px",
            background: status.hasToken ? "rgba(0,184,148,.15)" : "rgba(255,218,121,.15)",
            color: status.hasToken ? "#00B894" : "#b8860b",
          }}>
            {status.hasToken ? "OAuth token cached" : "Needs one-time browser auth"}
          </span>
        </div>
      )}

      {!status?.hasCredentials && (
        <ol className="text-xs text-faint lh-15 mb-3" style={{ paddingLeft: 16, margin: 0 }}>
          <li>Open <strong>console.cloud.google.com</strong> → create or select a project</li>
          <li>APIs &amp; Services → Library → enable <strong>Gmail API</strong></li>
          <li>OAuth consent screen → External, add yourself as a test user</li>
          <li>Credentials → Create → OAuth client ID → <strong>Desktop app</strong></li>
          <li>Download the JSON and paste it below (or use the file picker)</li>
        </ol>
      )}

      <div className="row gap-2 mb-2" style={{ alignItems: "flex-start" }}>
        <textarea
          className="inp"
          style={{ flex: 1, minHeight: 70, fontFamily: "monospace", fontSize: 11, resize: "vertical" }}
          placeholder='Paste credentials.json content here  {"installed": {"client_id": "..."}}'
          value={text}
          onChange={(e) => { setText(e.target.value); setError(""); }}
        />
      </div>

      <div className="row gap-2 mb-1">
        <button className="btn s" style={{ fontSize: 11 }} onClick={() => fileRef.current?.click()}>
          Browse file
        </button>
        <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleFile} />
        <button
          className="btn s"
          style={{ fontSize: 11 }}
          onClick={handleSave}
          disabled={saving || !text.trim()}
        >
          {flash || (saving ? "Saving…" : "Save credentials")}
        </button>
        {status?.hasCredentials && (
          <button className="btn s" style={{ fontSize: 11, color: "var(--rose, #e17055)" }} onClick={handleDelete}>
            Remove
          </button>
        )}
      </div>

      {error && <div className="text-xs mt-1" style={{ color: "var(--rose, #e17055)" }}>{error}</div>}

      {status?.hasCredentials && !status?.hasToken && (
        <div className="text-xs lh-15 mt-2" style={{
          background: "rgba(255,218,121,.1)", border: "1px solid rgba(255,218,121,.3)",
          borderRadius: 6, padding: "8px 10px",
        }}>
          <strong>Next step — one-time browser authorization</strong>
          <div className="mt-1 mb-2 text-faint">
            Credentials are saved, but Google still needs your consent before reading Gmail.
            Click below — a browser tab opens for Google consent, then the token is cached and the badge above turns green.
          </div>
          <button className="btn s" style={{ fontSize: 11 }} onClick={handleAuthorize} disabled={authorizing}>
            {authorizing ? "Waiting for Google consent…" : "Authorize with Google"}
          </button>
          {authError && (
            <div className="text-xs mt-2" style={{ color: "var(--rose, #e17055)" }}>{authError}</div>
          )}
        </div>
      )}

      {/* Once authorized, let the user actually search their inbox from the app. */}
      {status?.hasToken && (
        <div className="mt-3">
          <button className="btn s" style={{ fontSize: 11 }} onClick={searchBills} disabled={billsLoading}>
            {billsLoading ? "Searching…" : "Search recent bills"}
          </button>

          {billsError && (
            <div className="text-xs mt-2" style={{ color: "var(--rose, #e17055)" }}>{billsError}</div>
          )}

          {bills && bills.length === 0 && !billsError && (
            <div className="text-xs text-faint mt-2">No statement emails found in the last year.</div>
          )}

          {bills && bills.length > 0 && (
            <div className="col gap-2 mt-2">
              {bills.map((b) => (
                <div key={b.id} className="surface-tile" style={{ padding: "8px 11px" }}>
                  <div className="row-between" style={{ gap: 8 }}>
                    <span className="text-sm fw-700 truncate" style={{ flex: 1 }}>{b.subject || "(no subject)"}</span>
                    {b.likely_bill && (
                      <span style={{ fontSize: 9, background: "rgba(0,184,148,.15)", color: "#00B894", borderRadius: 4, padding: "1px 5px", flexShrink: 0 }}>bill</span>
                    )}
                  </div>
                  <div className="text-xs text-faint truncate">{b.sender} · {b.date}</div>
                  {(b.parsed?.statement_balance != null || b.parsed?.minimum_due != null || b.parsed?.due_date) && (
                    <div className="text-xs mt-1" style={{ color: "var(--text-2)" }}>
                      {b.parsed.statement_balance != null && <>Balance <strong>${b.parsed.statement_balance.toFixed(2)}</strong>{"  "}</>}
                      {b.parsed.minimum_due != null && <>· Min due <strong>${b.parsed.minimum_due.toFixed(2)}</strong>{"  "}</>}
                      {b.parsed.due_date && <>· Due <strong>{b.parsed.due_date}</strong></>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function GitHubPanel() {
  const {
    ghToken, setGhToken, ghRepo, setGhRepo, ghSyncing,
    saveGHSettings, doSync, doLoad, setShowGhPanel, clearAllData,
  } = useAppContext();

  const initialConfig = getAIConfig();
  const [selectedProvider, setSelectedProvider] = useState(initialConfig.provider);
  const [apiKeys, setApiKeys] = useState({
    claude: localStorage.getItem("fl_claude_key") || "",
    openai: localStorage.getItem("fl_openai_key") || "",
    gemini: localStorage.getItem("fl_gemini_key") || "",
  });
  const [models, setModels] = useState({
    claude: getProviderModel("claude"),
    openai: getProviderModel("openai"),
    gemini: getProviderModel("gemini"),
  });
  // tracks keys/models that have been typed but not yet saved
  const [dirtyKeys, setDirtyKeys] = useState({});
  const [savedFlash, setSavedFlash] = useState({});
  const [dirtyModels, setDirtyModels] = useState({});
  const [savedModelFlash, setSavedModelFlash] = useState({});

  const providerConfig = PROVIDERS[selectedProvider] || PROVIDERS.claude;

  const repoValid = /^[\w.-]+\/[\w.-]+$/.test(ghRepo.trim());
  const tokenLooksRight = !ghToken || ghToken.startsWith("ghp_") || ghToken.startsWith("github_pat_");
  const canSync = !!ghToken && repoValid;

  const handleProviderSelect = (providerKey) => {
    setSelectedProvider(providerKey);
    setAIConfig(providerKey);
  };

  const handleKeyChange = (providerKey, value) => {
    setApiKeys((prev) => ({ ...prev, [providerKey]: value }));
    setDirtyKeys((prev) => ({ ...prev, [providerKey]: true }));
    setSavedFlash((prev) => ({ ...prev, [providerKey]: false }));
  };

  const handleKeySave = useCallback((providerKey) => {
    localStorage.setItem(PROVIDERS[providerKey].keyStorageKey, apiKeys[providerKey]);
    setDirtyKeys((prev) => ({ ...prev, [providerKey]: false }));
    setSavedFlash((prev) => ({ ...prev, [providerKey]: true }));
    setTimeout(() => setSavedFlash((prev) => ({ ...prev, [providerKey]: false })), 1800);
  }, [apiKeys]);

  const handleModelChange = (providerKey, value) => {
    setModels((prev) => ({ ...prev, [providerKey]: value }));
    setDirtyModels((prev) => ({ ...prev, [providerKey]: true }));
    setSavedModelFlash((prev) => ({ ...prev, [providerKey]: false }));
  };

  const handleModelSave = useCallback((providerKey) => {
    setProviderModel(providerKey, models[providerKey]);
    setDirtyModels((prev) => ({ ...prev, [providerKey]: false }));
    setSavedModelFlash((prev) => ({ ...prev, [providerKey]: true }));
    setTimeout(() => setSavedModelFlash((prev) => ({ ...prev, [providerKey]: false })), 1800);
  }, [models]);

  return (
    <div className="panel-wrap">

      {/* Panel header with close button */}
      <div className="row-between mb-3">
        <span className="panel-section-label" style={{ margin: 0 }}>Sync &amp; AI Settings</span>
        <button
          className="btn s"
          onClick={() => setShowGhPanel(false)}
          aria-label="Close panel"
          style={{ lineHeight: 1, padding: "3px 8px" }}
        >
          ✕
        </button>
      </div>

      {/* GitHub sync row */}
      <div className="row gap-3 wrap mb-2" style={{ maxWidth: 900, alignItems: "flex-end" }}>
        <div className="flex-1" style={{ minWidth: 180 }}>
          <label htmlFor="gh-token" className="field-label">GitHub Token (repo scope)</label>
          <input
            id="gh-token"
            className="inp w-full"
            type="password"
            placeholder="ghp_xxxxxxxxxxxx"
            value={ghToken}
            onChange={(e) => setGhToken(e.target.value)}
          />
          {ghToken && <ApiKeyWarning provider="github" />}
        </div>
        <div className="flex-1" style={{ minWidth: 150 }}>
          <label htmlFor="gh-repo" className="field-label">Repo (owner/repo-name)</label>
          <input
            id="gh-repo"
            className="inp w-full"
            placeholder="yourname/finlens-data"
            value={ghRepo}
            onChange={(e) => setGhRepo(e.target.value)}
          />
        </div>
        <button className="btn s" onClick={saveGHSettings}>Save</button>
        <button className="btn accent" onClick={doSync} disabled={ghSyncing || !canSync} title={!canSync ? "Enter a valid token and repo first" : ""} style={{ minWidth: 64 }}>
          {ghSyncing ? <Spinner /> : "Sync"}
        </button>
        <button className="btn s" onClick={doLoad} disabled={ghSyncing || !canSync} title={!canSync ? "Enter a valid token and repo first" : ""} style={{ minWidth: 56 }}>
          {ghSyncing ? <Spinner /> : "Load"}
        </button>
      </div>
      {!tokenLooksRight && ghToken && (
        <div className="text-sm text-amber mt-1">Token format looks unexpected — should start with ghp_ or github_pat_</div>
      )}
      {ghRepo && !repoValid && (
        <div className="text-sm text-rose mt-1">Repo must be in owner/repo-name format (e.g. johndoe/finlens-data)</div>
      )}

      <div className="divider" style={{ marginTop: 10 }} />
      <GmailSection />

      <div className="divider" style={{ marginTop: 10 }} />
      <div className="panel-section-label">AI Categorization</div>

      {/* Provider cards */}
      <div className="row gap-3 mb-6 wrap">
        {Object.entries(PROVIDERS).map(([key, p]) => {
          const active = selectedProvider === key;
          const hasKey = !!apiKeys[key];
          return (
            <button
              key={key}
              onClick={() => handleProviderSelect(key)}
              className={`provider-card${active ? " active" : ""}`}
            >
              <div className="row-between mb-1">
                <span className="fw-700 text-md" style={{ color: active ? "var(--text)" : "var(--text-2)" }}>
                  {PROVIDER_ICONS[key]} {p.name}
                </span>
                {hasKey && (
                  <span style={{ fontSize: 9, background: "rgba(0,184,148,.15)", color: "#00B894", borderRadius: 4, padding: "1px 5px" }}>
                    Key set
                  </span>
                )}
              </div>
              <div className="text-xs text-faint">{p.company}</div>
            </button>
          );
        })}
      </div>

      {/* API key + model for the selected provider */}
      <div className="row gap-3 wrap mb-5" style={{ alignItems: "flex-start" }}>
        {/* API key */}
        <div style={{ flex: 1, minWidth: 240, maxWidth: 380 }}>
          <label htmlFor="ai-api-key" className="field-label">{providerConfig.keyLabel}</label>
          <div className="row gap-2" style={{ alignItems: "center" }}>
            <input
              id="ai-api-key"
              className="inp"
              style={{ flex: 1 }}
              type="password"
              placeholder={providerConfig.keyPlaceholder}
              value={apiKeys[selectedProvider]}
              onChange={(e) => handleKeyChange(selectedProvider, e.target.value)}
            />
            <button
              className="btn s"
              onClick={() => handleKeySave(selectedProvider)}
              disabled={!dirtyKeys[selectedProvider]}
              style={{ whiteSpace: "nowrap" }}
            >
              {savedFlash[selectedProvider] ? "Saved ✓" : "Save"}
            </button>
          </div>
          <div className="key-hint">Get a key at <span className="text-accent">{providerConfig.keyHelp}</span></div>
          {apiKeys[selectedProvider] && !dirtyKeys[selectedProvider] && (
            <>
              <div className="key-active">
                AI categorization active using <strong>{providerConfig.name}</strong>
              </div>
              <ApiKeyWarning provider={selectedProvider} />
            </>
          )}
        </div>

        {/* Model override */}
        <div style={{ flex: 1, minWidth: 240, maxWidth: 380 }}>
          <label htmlFor="ai-model" className="field-label">
            Model
            <span className="text-faint" style={{ fontWeight: 400, marginLeft: 4 }}>(optional)</span>
          </label>
          <div className="row gap-2" style={{ alignItems: "center" }}>
            <input
              id="ai-model"
              className="inp"
              style={{ flex: 1 }}
              type="text"
              placeholder={providerConfig.modelDefault}
              value={models[selectedProvider]}
              onChange={(e) => handleModelChange(selectedProvider, e.target.value)}
            />
            <button
              className="btn s"
              onClick={() => handleModelSave(selectedProvider)}
              disabled={!dirtyModels[selectedProvider]}
              style={{ whiteSpace: "nowrap" }}
            >
              {savedModelFlash[selectedProvider] ? "Saved ✓" : "Save"}
            </button>
          </div>
          <div className="key-hint" style={{ lineHeight: 1.55 }}>
            {providerConfig.modelDescription}
            <br />
            <span style={{ opacity: 0.75 }}>Options: </span>
            <span className="text-accent">{providerConfig.modelSuggestions}</span>
            <br />
            <span style={{ opacity: 0.75 }}>Docs: </span>
            <span className="text-accent">{providerConfig.modelDocsUrl}</span>
          </div>
          {models[selectedProvider] && !dirtyModels[selectedProvider] && (
            <div className="key-active">
              Using model: <strong>{models[selectedProvider]}</strong>
            </div>
          )}
          {!models[selectedProvider] && (
            <div className="key-hint" style={{ marginTop: 4, fontStyle: "italic" }}>
              Defaults to <strong>{providerConfig.modelDefault}</strong> when left blank
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-faint lh-15">
        When you upload statements, unrecognized merchants are categorized by your local FinLens backend using the selected provider (or a local model if no key is set) — results are cached so each merchant is only looked up once.
      </div>

      <div className="divider" style={{ marginTop: 14 }} />
      <div className="panel-section-label">Data</div>
      <div className="text-xs text-faint lh-15 mb-2">
        Removes every imported transaction, budget, custom rule, and the AI category
        cache from this browser — and clears the backend RAG index so <strong>Ask FinLens</strong> stops
        answering from deleted data. Your name setup and planning inputs are kept. This can't be undone.
      </div>
      <ConfirmButton label="Clear everything?" onConfirm={clearAllData}>
        <button className="btn s" style={{ fontSize: 11, color: "var(--rose, #e17055)" }}>
          Clear all data
        </button>
      </ConfirmButton>
    </div>
  );
}

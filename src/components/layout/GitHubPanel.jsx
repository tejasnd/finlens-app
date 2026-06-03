import { useState } from "react";
import { PROVIDERS, getAIConfig, setAIConfig } from "../../services/aiCategorizerService";
import { useAppContext } from "../../context/AppContext";

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

export default function GitHubPanel() {
  const {
    ghToken, setGhToken, ghRepo, setGhRepo, ghSyncing,
    saveGHSettings, doSync, doLoad,
  } = useAppContext();

  const initialConfig = getAIConfig();
  const [selectedProvider, setSelectedProvider] = useState(initialConfig.provider);
  const [selectedModel, setSelectedModel] = useState(initialConfig.model);
  const [apiKeys, setApiKeys] = useState({
    claude: localStorage.getItem("fl_claude_key") || "",
    openai: localStorage.getItem("fl_openai_key") || "",
    gemini: localStorage.getItem("fl_gemini_key") || "",
  });

  const providerConfig = PROVIDERS[selectedProvider] || PROVIDERS.claude;

  const repoValid = /^[\w.-]+\/[\w.-]+$/.test(ghRepo.trim());
  const tokenLooksRight = !ghToken || ghToken.startsWith("ghp_") || ghToken.startsWith("github_pat_");
  const canSync = !!ghToken && repoValid;

  const handleProviderSelect = (providerKey) => {
    const firstModel = PROVIDERS[providerKey].models[0].id;
    setSelectedProvider(providerKey);
    setSelectedModel(firstModel);
    setAIConfig(providerKey, firstModel);
  };

  const handleModelSelect = (modelId) => {
    setSelectedModel(modelId);
    setAIConfig(selectedProvider, modelId);
  };

  const handleKeyChange = (providerKey, value) => {
    setApiKeys((prev) => ({ ...prev, [providerKey]: value }));
    localStorage.setItem(PROVIDERS[providerKey].keyStorageKey, value);
  };

  const selectedModelInfo = providerConfig.models.find((m) => m.id === selectedModel) || providerConfig.models[0];

  return (
    <div className="panel-wrap">

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

      {/* Model picker + API key row */}
      <div className="row gap-3 wrap mb-5" style={{ alignItems: "flex-start" }}>
        <div style={{ flex: 2, minWidth: 200 }}>
          <div className="field-label" id="model-group-label">Model</div>
          <div className="col gap-2">
            {providerConfig.models.map((m) => (
              <label key={m.id} className={`model-option${selectedModel === m.id ? " active" : ""}`}>
                <input
                  type="radio"
                  name="model"
                  value={m.id}
                  checked={selectedModel === m.id}
                  onChange={() => handleModelSelect(m.id)}
                  style={{ marginTop: 2, accentColor: "#7C8CF8" }}
                />
                <div>
                  <div className="row gap-3">
                    <span className="text-base fw-600">{m.name}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 600,
                      background: `${m.badgeColor}22`, color: m.badgeColor,
                      borderRadius: 4, padding: "1px 6px", letterSpacing: "0.03em",
                    }}>
                      {m.badge}
                    </span>
                  </div>
                  <div className="text-xs text-faint mt-1">{m.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 200 }}>
          <label htmlFor="ai-api-key" className="field-label">{providerConfig.keyLabel}</label>
          <input
            id="ai-api-key"
            className="inp w-full"
            type="password"
            placeholder={providerConfig.keyPlaceholder}
            value={apiKeys[selectedProvider]}
            onChange={(e) => handleKeyChange(selectedProvider, e.target.value)}
          />
          <div className="key-hint">
            {selectedProvider === "claude" && <>Get a key at <span className="text-accent">console.anthropic.com</span></>}
            {selectedProvider === "openai" && <>Get a key at <span className="text-accent">platform.openai.com</span></>}
            {selectedProvider === "gemini" && <>Get a key at <span className="text-accent">aistudio.google.com</span></>}
          </div>
          {apiKeys[selectedProvider] && (
            <>
              <div className="key-active">
                AI categorization active using <strong>{selectedModelInfo.name}</strong>
              </div>
              <ApiKeyWarning provider={selectedProvider} />
            </>
          )}
        </div>
      </div>

      <div className="text-xs text-faint lh-15">
        When you upload statements, unrecognized merchants are sent in batches to the selected AI provider — results are cached locally so each merchant is only looked up once.
      </div>
    </div>
  );
}

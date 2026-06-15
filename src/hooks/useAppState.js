import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { CATEGORIES, MONTHS, DEFAULT_PLAN, SHARED_CATS, TOP_MERCHANTS_COUNT } from "../constants";
import { getLocalState, saveLocalState } from "../utils/storage";
import { clearCache } from "../utils/categoryCache";
import { parseFile } from "../services/fileParser";
import { billToTransaction } from "../services/gmailBills";
import { smartCategoryAI, applyCustomRules } from "../utils/categorization";
import { calcSettlement } from "../services/settlement";
import { groupMerchants } from "../utils/formatters";
import { useDebounce } from "./useDebounce";

export function useAppState() {
  // ── Toasts ────────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState([]);
  const notify = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);
  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Persons ───────────────────────────────────────────────────────────────
  const [persons, setPersons] = useState(
    () => getLocalState()?.persons || { A: { name: "", color: "#FF6B9D" }, B: { name: "", color: "#7C8CF8" } }
  );
  const [draftNames, setDraftNames] = useState({ A: "", B: "" });
  const [showSetupModal, setShowSetupModal] = useState(false);

  // Stable object references: only recomputed when name/color actually change.
  // Without useMemo these are plain literals recreated every render, which
  // destabilizes monthlyData's dep array and spuriously re-runs that memo.
  const personA = useMemo(
    () => ({ name: persons.A.name, color: persons.A.color, short: persons.A.name ? persons.A.name[0].toUpperCase() : "A" }),
    [persons.A.name, persons.A.color]
  );
  const personB = useMemo(
    () => ({ name: persons.B.name, color: persons.B.color, short: persons.B.name ? persons.B.name[0].toUpperCase() : "B" }),
    [persons.B.name, persons.B.color]
  );
  const isSetup = !!(persons.A.name && persons.B.name);

  const openSetup = useCallback(() => {
    setDraftNames({ A: persons.A.name, B: persons.B.name });
    setShowSetupModal(true);
  }, [persons.A.name, persons.B.name]);

  const completeSetup = useCallback(() => {
    if (!draftNames.A.trim() || !draftNames.B.trim()) return;
    const oldA = persons.A.name;
    const oldB = persons.B.name;
    const newA = draftNames.A.trim();
    const newB = draftNames.B.trim();
    setPersons({ A: { name: newA, color: "#FF6B9D" }, B: { name: newB, color: "#7C8CF8" } });
    if (oldA && (oldA !== newA || oldB !== newB)) {
      setTransactions((prev) =>
        prev.map((t) => ({
          ...t,
          owner: t.owner === oldA ? newA : t.owner === oldB ? newB : t.owner,
        }))
      );
    }
    setShowSetupModal(false);
  }, [draftNames, persons]);

  // ── Transactions ──────────────────────────────────────────────────────────
  const [transactions, setTransactions] = useState(() => {
    const s = getLocalState();
    return s?.transactions?.map((t) => ({ ...t, date: new Date(t.date) })) || [];
  });
  const [loading, setLoading] = useState(false);
  // null = idle; object = { done, total, categorized, skipped } during/after AI run
  const [aiProgress, setAiProgress] = useState(null);
  const aiSignalRef = useRef({ cancelled: false });

  // ── Custom rules ──────────────────────────────────────────────────────────
  const [customRules, setCustomRules] = useState(() => getLocalState()?.customRules || []);
  const [newKw, setNewKw] = useState("");
  const [newCat, setNewCat] = useState(CATEGORIES[0]);
  const [showRules, setShowRules] = useState(false);

  // ── Upload ────────────────────────────────────────────────────────────────
  const [uploadOwner, setUploadOwner] = useState(personA.name);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // ── Split ─────────────────────────────────────────────────────────────────
  const [splitPct, setSplitPct] = useState(() => {
    const s = getLocalState()?.splitPct;
    if (!s) return { A: 50, B: 50 };
    if ("K" in s) return { A: s.K, B: s.T }; // migrate old format
    return s;
  });
  const [showSplitModal, setShowSplitModal] = useState(false);

  // ── Budgets ───────────────────────────────────────────────────────────────
  const [budgets, setBudgets] = useState(() => getLocalState()?.budgets || {});
  const [editBudgetCat, setEditBudgetCat] = useState(null);
  const [budgetVal, setBudgetVal] = useState("");

  // ── Planning ──────────────────────────────────────────────────────────────
  const [planData, setPlanData] = useState(() => {
    const s = getLocalState()?.planData;
    if (!s) return DEFAULT_PLAN;
    return {
      ...DEFAULT_PLAN,
      personAIncome: s.personAIncome ?? s.kadambariIncome ?? 0,
      personBIncome: s.personBIncome ?? s.tejasIncome ?? 0,
      personA401k:   s.personA401k ?? s.k401kPct ?? 0,
      personB401k:   s.personB401k ?? s.t401kPct ?? 0,
      rothGoal:      s.rothGoal ?? 7000,
      hsaGoal:       s.hsaGoal ?? 4300,
      savingsGoal:   s.savingsGoal ?? 20000,
      investments:   s.investments ?? DEFAULT_PLAN.investments,
    };
  });
  const [editPlan, setEditPlan] = useState(false);

  // ── GitHub ────────────────────────────────────────────────────────────────
  const [ghToken, setGhToken] = useState(() => localStorage.getItem("fl_gh_token") || "");
  const [ghRepo, setGhRepo] = useState(() => localStorage.getItem("fl_gh_repo") || "");
  const [showGhPanel, setShowGhPanel] = useState(false);
  const [ghSyncing, setGhSyncing] = useState(false);

  // ── Filters / navigation ──────────────────────────────────────────────────
  const [tab, setTab] = useState("Overview");
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [filterOwner, setFilterOwner] = useState("All");
  const [dateRange, setDateRange] = useState("All");
  const [sortConfig, setSortConfig] = useState({ key: "date", direction: "desc" });
  const [txPage, setTxPage] = useState(1);

  // ── Persist to localStorage ───────────────────────────────────────────────
  useEffect(() => {
    saveLocalState({
      transactions: transactions.map((t) => ({ ...t, date: t.date.toISOString() })),
      budgets, planData, splitPct, customRules, persons,
    });
  }, [transactions, budgets, planData, splitPct, customRules, persons]);

  // ── Derived data ──────────────────────────────────────────────────────────

  // Debounce search by 150 ms so the filter memo doesn't run on every keystroke
  // while the controlled input itself still updates immediately.
  const debouncedSearch = useDebounce(search, 150);

  // Returns a date N months (or years) before `from`, clamped to the last valid
  // day of the target month (e.g. Jan 31 - 1M → Dec 31, not Jan 3).
  const subtractMonths = (from, months) => {
    const y = from.getFullYear();
    const m = from.getMonth() - months;
    const d = from.getDate();
    const lastDay = new Date(y, m + 1, 0).getDate(); // day 0 of next month = last day of target
    return new Date(y, m, Math.min(d, lastDay));
  };

  const filtered = useMemo(() => {
    const result = transactions.filter((t) => {
      if (filterOwner !== "All" && t.owner !== filterOwner) return false;
      if (filterCat !== "All" && t.category !== filterCat) return false;
      if (debouncedSearch && !t.description.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
      if (dateRange !== "All") {
        const now = new Date();
        let start = null;
        if (dateRange === "1M") start = subtractMonths(now, 1);
        if (dateRange === "3M") start = subtractMonths(now, 3);
        if (dateRange === "6M") start = subtractMonths(now, 6);
        if (dateRange === "1Y") start = subtractMonths(now, 12);
        if (start && t.date < start) return false;
      }
      return true;
    });

    return result.sort((a, b) => {
      let aVal = sortConfig.key === "date" ? a.date.getTime() : a[sortConfig.key];
      let bVal = sortConfig.key === "date" ? b.date.getTime() : b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [transactions, filterCat, filterOwner, debouncedSearch, dateRange, sortConfig]);

  const spendOnly = useMemo(
    () => filtered.filter((t) => t.amount > 0 && t.category !== "Finance & Fees"),
    [filtered]
  );

  // Includes refunds (negative amounts) so settlement correctly nets them out.
  // Finance & Fees (credit card payments) are excluded to avoid double-counting.
  const settleTransactions = useMemo(
    () => filtered.filter((t) => t.category !== "Finance & Fees"),
    [filtered]
  );

  useEffect(() => setTxPage(1), [filtered]);

  const totalSpend = useMemo(() => spendOnly.reduce((s, t) => s + t.amount, 0), [spendOnly]);

  const catTotals = useMemo(() => {
    const m = {};
    spendOnly.forEach((t) => { m[t.category] = (m[t.category] || 0) + t.amount; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [spendOnly]);

  const monthlyData = useMemo(() => {
    const m = {};
    spendOnly.forEach((t) => {
      const k = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}`;
      if (!m[k]) {
        m[k] = {
          month: `${MONTHS[t.date.getMonth()]} ${t.date.getFullYear()}`,
          sortKey: new Date(t.date.getFullYear(), t.date.getMonth(), 1).getTime(),
          total: 0, personA: 0, personB: 0,
          ...Object.fromEntries(CATEGORIES.map((c) => [c, 0])),
        };
      }
      m[k].total += t.amount;
      if (t.owner === personA.name) m[k].personA += t.amount;
      if (t.owner === personB.name) m[k].personB += t.amount;
      m[k][t.category] = (m[k][t.category] || 0) + t.amount;
    });
    return Object.values(m).sort((a, b) => a.sortKey - b.sortKey);
  }, [spendOnly, personA.name, personB.name]);

  const topMerchants = useMemo(
    () => groupMerchants(spendOnly).sort((a, b) => b.total - a.total).slice(0, TOP_MERCHANTS_COUNT),
    [spendOnly]
  );

  const settlement = useMemo(
    () => calcSettlement(settleTransactions, splitPct, personA.name, personB.name),
    [settleTransactions, splitPct, personA.name, personB.name]
  );

  const avgMonthly = monthlyData.length ? totalSpend / monthlyData.length : 0;
  const uncategorized = useMemo(
    () => transactions.filter((t) => t.category === "Other").length,
    [transactions]
  );

  const budgetStatus = useMemo(() => {
    const cur = monthlyData[monthlyData.length - 1];
    if (!cur) return [];
    return CATEGORIES.filter((c) => budgets[c]).map((c) => ({
      category: c,
      budget: budgets[c],
      actual: cur[c] || 0,
      pct: Math.min(100, ((cur[c] || 0) / budgets[c]) * 100),
      over: (cur[c] || 0) > budgets[c],
    }));
  }, [monthlyData, budgets]);

  const personANet = planData.personAIncome * (1 - planData.personA401k / 100) * 0.72;
  const personBNet = planData.personBIncome * (1 - planData.personB401k / 100) * 0.72;
  const totalNet = personANet + personBNet;
  const totalInv = Object.values(planData.investments).reduce((s, v) => s + (v || 0), 0);
  const savingsRate = totalNet > 0 ? ((totalNet - avgMonthly) / totalNet * 100).toFixed(1) : 0;
  const isEmpty = transactions.length === 0;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSort = useCallback((key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  }, []);

  const cancelAI = useCallback(() => {
    aiSignalRef.current.cancelled = true;
  }, []);

  // Re-run AI categorization on transactions already imported. Only touches rows
  // still in "Other" (never clobbers manual fixes or rule matches), and forces a
  // fresh LLM call so it's useful after you add an API key or start the backend.
  const recategorizeAI = useCallback(async () => {
    const others = transactions.filter((t) => t.category === "Other");
    if (!others.length) {
      notify('Nothing to re-categorize — no transactions are in "Other".', "info");
      return;
    }
    const signal = { cancelled: false };
    aiSignalRef.current = signal;
    setAiProgress({ done: 0, total: others.length, phase: "running" });

    const result = await smartCategoryAI(transactions, {
      force: true,
      signal,
      onProgress: ({ done, total }) => setAiProgress({ done, total, phase: "running" }),
    });

    if (signal.cancelled) { setAiProgress(null); return; }
    if (result.status === "offline") {
      notify("AI categorization skipped — FinLens backend isn't running.", "info");
      setAiProgress(null);
      return;
    }
    if (result.status === "error") {
      notify("AI categorization failed — the LLM was unreachable. Check Ollama or your API key in Sync & AI Settings.", "error");
      setAiProgress(null);
      return;
    }

    setTransactions(result.transactions);
    const skipped = result.transactions.filter((t) => t.category === "Other").length;
    const categorized = Math.max(0, others.length - skipped);
    setAiProgress({ done: others.length, total: others.length, phase: "done", categorized, skipped });
    notify(
      categorized
        ? `AI categorized ${categorized} transaction${categorized !== 1 ? "s" : ""}.`
        : "The model couldn't confidently categorize the remaining transactions.",
      categorized ? "success" : "info"
    );
  }, [transactions, notify]);

  const doFiles = useCallback(async (files, owner) => {
    setLoading(true);
    setAiProgress(null);
    // Fresh signal for this run
    const signal = { cancelled: false };
    aiSignalRef.current = signal;

    try {
      const results = await Promise.all([...files].map((f) => parseFile(f, owner)));
      let merged = results.flat().map((t) => {
        const matched = applyCustomRules(t.description, customRules);
        return matched ? { ...t, category: matched } : t;
      });

      const uncategorizedCount = merged.filter((t) => t.category === "Other").length;
      const categorizedBefore = merged.filter((t) => t.category !== "Other").length;

      if (uncategorizedCount > 0) {
        setAiProgress({ done: 0, total: uncategorizedCount, phase: "running" });

        const aiResult = await smartCategoryAI(merged, {
          signal,
          onProgress: ({ done, total }) => {
            setAiProgress({ done, total, phase: "running" });
          },
        });
        merged = aiResult.transactions;

        if (signal.cancelled) {
          setAiProgress(null);
        } else if (aiResult.status === "offline") {
          // Surface the silent-no-op: data is still imported, just not AI-labeled.
          notify('AI categorization skipped — FinLens backend isn\'t running. Imported as "Other".', "info");
          setAiProgress(null);
        } else if (aiResult.status === "error") {
          notify("AI categorization failed — the LLM was unreachable. Check Ollama or your API key in Sync & AI Settings.", "error");
          setAiProgress(null);
        } else {
          const categorized = merged.filter((t) => t.category !== "Other").length - categorizedBefore;
          const skipped = merged.filter((t) => t.category === "Other").length;
          setAiProgress({ done: uncategorizedCount, total: uncategorizedCount, phase: "done", categorized: Math.max(0, categorized), skipped });
        }
      }

      setTransactions((prev) => {
        const ids = new Set(prev.map((t) => t.id));
        const added = merged.filter((t) => !ids.has(t.id));
        if (!signal.cancelled) notify(`Imported ${added.length} transaction${added.length !== 1 ? "s" : ""}.`, "success");
        return [...prev, ...added];
      });
    } catch (e) {
      notify(e.message || "Failed to parse file.", "error");
      setAiProgress(null);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customRules]);

  const handleDrop = useCallback(
    (e, owner) => { e.preventDefault(); doFiles(e.dataTransfer.files, owner); },
    [doFiles]
  );

  // Import selected Gmail statements as bill records (summaries, not line items).
  // Deduped by Gmail message id so re-importing the same bill is a no-op. Returns
  // the number actually added.
  const importGmailBills = useCallback((bills, owner) => {
    const incoming = bills.map((b) => billToTransaction(b, owner));
    let addedCount = 0;
    setTransactions((prev) => {
      const ids = new Set(prev.map((t) => t.id));
      const added = incoming.filter((t) => !ids.has(t.id));
      addedCount = added.length;
      return [...prev, ...added];
    });
    notify(
      addedCount
        ? `Imported ${addedCount} bill${addedCount !== 1 ? "s" : ""} from Gmail.`
        : "Those bills were already imported.",
      addedCount ? "success" : "info"
    );
    return addedCount;
  }, [notify]);

  const openFilePicker = useCallback((owner) => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = ".xlsx,.xls,.csv";
    inp.multiple = true;
    inp.onchange = (e) => { doFiles(e.target.files, owner); setShowUploadModal(false); };
    inp.click();
  }, [doFiles]);

  const addRule = useCallback(() => {
    const kw = newKw.trim().toLowerCase();
    if (!kw) return;
    setCustomRules((p) => [{ keyword: kw, category: newCat }, ...p]);
    setTransactions((p) =>
      p.map((t) => (t.description.toLowerCase().includes(kw) ? { ...t, category: newCat } : t))
    ); // uses .includes() — literal match, regex special chars are safe
    setNewKw("");
    notify(`Rule added: "${kw}" → ${newCat}`, "success");
  }, [newKw, newCat, notify]);

  const removeRule = useCallback(
    (i) => setCustomRules((p) => p.filter((_, j) => j !== i)),
    []
  );

  const updateCategory = useCallback((id, cat) => {
    setTransactions((p) => p.map((t) => (t.id === id ? { ...t, category: cat } : t)));
    setEditId(null);
  }, []);

  const updateSplitType = useCallback(
    (id, st) => setTransactions((p) => p.map((t) => (t.id === id ? { ...t, splitType: st } : t))),
    []
  );

  const deleteTransaction = useCallback(
    (id) => setTransactions((p) => p.filter((t) => t.id !== id)),
    []
  );

  // Wipe all imported financial data from this browser AND the backend RAG store,
  // so "Ask FinLens" stops answering from deleted data. Identity (persons) and
  // planning inputs are intentionally preserved.
  const clearAllData = useCallback(async () => {
    setTransactions([]);
    setBudgets({});
    setCustomRules([]);
    setSplitPct({ A: 50, B: 50 });
    clearCache();
    try {
      await fetch("/api/transactions", { method: "DELETE" });
    } catch {
      // Backend offline — local data is already cleared; the RAG store is
      // rebuilt from the (now empty) client dataset on the next index anyway.
    }
    notify("All transaction data cleared.", "success");
  }, [notify]);

  const saveGHSettings = useCallback(() => {
    localStorage.setItem("fl_gh_token", ghToken);
    localStorage.setItem("fl_gh_repo", ghRepo);
    notify("GitHub settings saved.", "success");
  }, [ghToken, ghRepo, notify]);

  const buildSyncPayload = () => ({
    transactions: transactions.map((t) => ({ ...t, date: t.date.toISOString() })),
    budgets, planData, splitPct, customRules, persons,
    lastSync: new Date().toISOString(),
  });

  const doSync = async () => {
    if (!ghToken || !ghRepo) { notify("Enter a GitHub token and repo first.", "error"); return; }
    setGhSyncing(true);
    try {
      const { syncToGitHub } = await import("../services/github");
      await syncToGitHub(ghToken, ghRepo, buildSyncPayload());
      notify("Synced to GitHub at " + new Date().toLocaleTimeString(), "success");
    } catch (e) { notify("Sync failed: " + e.message, "error"); }
    setGhSyncing(false);
  };

  const doLoad = async () => {
    if (!ghToken || !ghRepo) { notify("Enter a GitHub token and repo first.", "error"); return; }
    setGhSyncing(true);
    try {
      const { loadFromGitHub } = await import("../services/github");
      const data = await loadFromGitHub(ghToken, ghRepo);
      if (data.transactions)
        setTransactions((prev) => {
          const ids = new Set(prev.map((t) => t.id));
          return [...prev, ...data.transactions.filter((t) => !ids.has(t.id))];
        });
      if (data.budgets) setBudgets(data.budgets);
      if (data.planData) setPlanData(data.planData);
      if (data.splitPct) setSplitPct(data.splitPct);
      if (data.customRules) setCustomRules(data.customRules);
      if (data.persons) setPersons(data.persons);
      notify("Loaded data from GitHub.", "success");
    } catch (e) { notify("Load failed: " + e.message, "error"); }
    setGhSyncing(false);
  };

  return {
    // toasts
    toasts, notify, dismissToast,
    // persons
    persons, personA, personB, isSetup,
    draftNames, setDraftNames, showSetupModal, setShowSetupModal, openSetup, completeSetup,
    // transactions
    transactions, loading,
    updateCategory, updateSplitType, deleteTransaction, clearAllData,
    // files
    uploadOwner, setUploadOwner, showUploadModal, setShowUploadModal,
    doFiles, handleDrop, openFilePicker, importGmailBills,
    aiProgress, setAiProgress, cancelAI, recategorizeAI,
    // custom rules
    customRules, newKw, setNewKw, newCat, setNewCat, showRules, setShowRules,
    addRule, removeRule,
    // split
    splitPct, setSplitPct, showSplitModal, setShowSplitModal,
    // budgets
    budgets, setBudgets, editBudgetCat, setEditBudgetCat, budgetVal, setBudgetVal,
    // planning
    planData, setPlanData, editPlan, setEditPlan,
    // github
    ghToken, setGhToken, ghRepo, setGhRepo,
    showGhPanel, setShowGhPanel, ghSyncing, saveGHSettings, doSync, doLoad,
    // filters / nav
    tab, setTab, editId, setEditId,
    search, setSearch, filterCat, setFilterCat, filterOwner, setFilterOwner,
    dateRange, setDateRange, sortConfig, handleSort, txPage, setTxPage,
    // derived
    filtered, spendOnly, totalSpend, catTotals, monthlyData, topMerchants,
    settlement, avgMonthly, uncategorized, budgetStatus,
    personANet, personBNet, totalNet, totalInv, savingsRate, isEmpty,
  };
}

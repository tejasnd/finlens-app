import "./styles/finlens.css";
import { memo } from "react";
import { AppProvider, useAppContext } from "./context/AppContext";

import SetupModal       from "./components/modals/SetupModal";
import UploadModal      from "./components/modals/UploadModal";
import SplitModal       from "./components/modals/SplitModal";
import Sidebar          from "./components/layout/Sidebar";
import Header           from "./components/layout/Header";
import GitHubPanel      from "./components/layout/GitHubPanel";
import RulesPanel       from "./components/layout/RulesPanel";
import EmptyState       from "./components/layout/EmptyState";
import OverviewTab      from "./components/tabs/OverviewTab";
import CoupleTab        from "./components/tabs/CoupleTab";
import MonthlyTab       from "./components/tabs/MonthlyTab";
import CategoriesTab    from "./components/tabs/CategoriesTab";
import BudgetTab        from "./components/tabs/BudgetTab";
import PlanningTab      from "./components/tabs/PlanningTab";
import TransactionsTab  from "./components/tabs/TransactionsTab";
import SubscriptionsTab from "./components/tabs/SubscriptionsTab";
import ErrorBoundary      from "./components/layout/ErrorBoundary";
import { ToastContainer } from "./components/layout/Toast";

const DATA_TABS = ["Overview", "Couple", "Monthly", "Categories", "Transactions", "Subscriptions"];

// React.memo prevents re-renders triggered by AppShell re-rendering for
// reasons unrelated to the active tab (e.g. toast state changes). Each tab
// reads its own slice of context so context-driven re-renders still fire, but
// parent-driven ones are skipped. Defined at module level so the memoized
// references are stable across AppShell renders.
const TABS = {
  Overview:      memo(OverviewTab),
  Couple:        memo(CoupleTab),
  Monthly:       memo(MonthlyTab),
  Categories:    memo(CategoriesTab),
  Budget:        memo(BudgetTab),
  Subscriptions: memo(SubscriptionsTab),
  Planning:      memo(PlanningTab),
  Transactions:  memo(TransactionsTab),
};

function AppShell() {
  const {
    isSetup, isEmpty, tab,
    showSetupModal, showUploadModal, showSplitModal, showGhPanel, showRules,
    uncategorized, toasts, dismissToast,
  } = useAppContext();

  const showUploadPrompt = isEmpty && DATA_TABS.includes(tab);
  const TabComponent = TABS[tab];

  return (
    <>
      <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", display: "flex", minHeight: "100vh", color: "var(--text)" }}>
        {(!isSetup || showSetupModal) && <SetupModal />}
        {showUploadModal && <UploadModal />}
        {showSplitModal && <SplitModal />}

        <Sidebar />

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <Header />
          {showGhPanel && <GitHubPanel />}
          {showRules && <RulesPanel />}

          <main role="tabpanel" aria-label={tab} style={{ flex: 1, padding: "20px 28px" }}>
            {!isEmpty && uncategorized > 0 && (
              <div className="warn">
                <span><strong>{uncategorized}</strong> transactions still in "Other" — use Rules or click category badges in Transactions to fix.</span>
              </div>
            )}

            {showUploadPrompt ? (
              <EmptyState />
            ) : TabComponent ? (
              <ErrorBoundary tab={tab}>
                <TabComponent />
              </ErrorBoundary>
            ) : null}
          </main>
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

export default function FinanceApp() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

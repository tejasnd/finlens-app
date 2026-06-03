import { useCallback, useMemo, useState } from "react";
import { fmt } from "../../utils/formatters";
import { CAT_COLORS } from "../../constants";
import { useAppContext } from "../../context/AppContext";
import {
  detectSubscriptions,
  getExcludedMerchants,
  setExcludedMerchants,
} from "../../utils/subscriptionDetector";
import ConfirmButton from "../layout/ConfirmButton";

const dateOpts = { month: "short", day: "numeric", year: "numeric" };

export default function SubscriptionsTab() {
  const { transactions, notify } = useAppContext();
  const [excluded, setExcluded] = useState(() => getExcludedMerchants());

  const subscriptions = useMemo(
    () => detectSubscriptions(transactions, { excluded }),
    [transactions, excluded]
  );

  const totalMonthly = subscriptions.reduce((s, sub) => s + sub.monthlyEquivalent, 0);

  const excludeMerchant = useCallback(
    (key, name) => {
      setExcluded((prev) => {
        const next = new Set(prev);
        next.add(key);
        setExcludedMerchants(next);
        return next;
      });
      notify?.(`Removed "${name}" from subscriptions.`, "success");
    },
    [notify]
  );

  const restoreAll = useCallback(() => {
    setExcluded(() => {
      const empty = new Set();
      setExcludedMerchants(empty);
      return empty;
    });
    notify?.("Restored all excluded merchants.", "success");
  }, [notify]);

  if (!transactions.length) {
    return (
      <div className="card text-center text-faint" style={{ padding: "40px 20px" }}>
        No transaction data yet.
      </div>
    );
  }

  return (
    <div className="col-gap-12">
      <div className="g3">
        <div className="card text-center">
          <div className="fw-700 text-3xl" style={{ color: CAT_COLORS["Subscriptions"] }}>
            {subscriptions.length}
          </div>
          <div className="text-sm text-muted mt-1">Subscriptions detected</div>
        </div>
        <div className="card text-center">
          <div className="fw-700 text-3xl text-accent">{fmt(totalMonthly)}</div>
          <div className="text-sm text-muted mt-1">Monthly subscription spend</div>
        </div>
        <div className="card text-center">
          <div className="fw-700 text-3xl text-teal">{fmt(totalMonthly * 12)}</div>
          <div className="text-sm text-muted mt-1">Annual projection</div>
        </div>
      </div>

      <div className="card">
        <div className="row-between mb-6">
          <div className="fw-600 text-lg">All Subscriptions</div>
          <div className="row gap-3 text-sm text-muted">
            <span>{excluded.size} excluded</span>
            {excluded.size > 0 && (
              <button className="btn s text-sm" onClick={restoreAll}>
                Restore all
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x">
          <table className="tbl">
            <thead>
              <tr className="text-faint text-xs uppercase" style={{ letterSpacing: "0.05em" }}>
                <th className="th" style={{ textAlign: "left" }}>Merchant</th>
                <th className="th text-right">Estimated</th>
                <th className="th text-center">Frequency</th>
                <th className="th" style={{ textAlign: "left" }}>Last charge</th>
                <th className="th" style={{ textAlign: "left" }}>Next expected</th>
                <th className="th text-right">12-mo total</th>
                <th className="th text-center" aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr key={sub.key} className="tbl-row">
                  <td className="td">
                    <div className="fw-500">{sub.name}</div>
                    <div className="text-xs text-faint mt-1">{sub.category}</div>
                  </td>
                  <td className="mono td-r">{fmt(sub.estimatedAmount)}</td>
                  <td className="td text-center">
                    <span
                      className="badge"
                      style={{ background: "rgba(108,117,125,.15)", color: "var(--text-2)" }}
                    >
                      {sub.frequency}
                    </span>
                  </td>
                  <td className="td text-muted">
                    {sub.lastChargeDate.toLocaleDateString("en-US", dateOpts)}
                  </td>
                  <td className="td text-muted">
                    {sub.nextExpectedDate.toLocaleDateString("en-US", dateOpts)}
                  </td>
                  <td className="mono td-r text-muted">{fmt(sub.totalLast12Months)}</td>
                  <td className="td text-center">
                    <ConfirmButton
                      onConfirm={() => excludeMerchant(sub.key, sub.name)}
                      label="Not a subscription?"
                    >
                      <button
                        className="icon-btn"
                        aria-label={`Mark ${sub.name} as not a subscription`}
                        title="Mark as not a subscription"
                      >
                        ✕
                      </button>
                    </ConfirmButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {subscriptions.length === 0 && (
            <div className="text-center text-faint text-base" style={{ padding: "20px 0" }}>
              No subscriptions detected yet. Import more statements to see patterns.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

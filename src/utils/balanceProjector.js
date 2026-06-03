/**
 * Project a balance trajectory forward in time given a starting balance
 * and a recurring monthly net surplus/deficit.
 *
 * Used by the Planning tab to visualize wealth/cashflow over the next N months
 * assuming current spending and income hold steady.
 *
 * @param {Object} opts
 * @param {number} opts.startBalance       - Current total balance (e.g. totalInv)
 * @param {number} opts.monthlyDelta       - Net monthly change (income − spending)
 * @param {number} [opts.months=12]        - Projection horizon in months
 * @param {Date}   [opts.startDate]        - Reference date for month labels
 * @param {number|null} [opts.goalAmount]  - Savings target to overlay (relative to startBalance)
 * @returns {Array<{month: string, balance: number, goal: number|null}>}
 */
export function projectBalance({
  startBalance,
  monthlyDelta,
  months = 12,
  startDate = new Date(),
  goalAmount = null,
}) {
  const data = [];
  const goalLine = goalAmount != null ? startBalance + goalAmount : null;
  for (let i = 0; i <= months; i++) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i);
    data.push({
      month: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      balance: startBalance + monthlyDelta * i,
      goal: goalLine,
    });
  }
  return data;
}

/**
 * Given a savings target and timeline, compute the required monthly savings
 * rate and classify the user's current trajectory against it.
 *
 * @param {Object} opts
 * @param {number} opts.targetAmount   - Desired total savings amount
 * @param {number} opts.months         - Months in which to reach the target
 * @param {number} opts.currentSurplus - Net monthly cash flow today
 * @returns {{ requiredMonthly: number, gap: number, status: "on-track"|"short"|"deficit" }}
 *   - requiredMonthly: $ needed per month to hit the target
 *   - gap:             $ short per month (0 when on-track or in deficit)
 *   - status:          "deficit" if surplus ≤ 0, "on-track" if surplus ≥ required, else "short"
 */
export function calculateGoalPlan({ targetAmount, months, currentSurplus }) {
  const requiredMonthly = months > 0 ? targetAmount / months : 0;
  const status =
    currentSurplus <= 0 ? "deficit"
    : currentSurplus >= requiredMonthly ? "on-track"
    : "short";
  const gap = Math.max(0, requiredMonthly - currentSurplus);
  return { requiredMonthly, gap, status };
}

export function predictBudget(transactions, budgets) {
  if (!Array.isArray(transactions) || !budgets || typeof budgets !== "object") return [];
  if (!transactions.length || !Object.keys(budgets).length) return [];

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysElapsed = today.getDate();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const daysLeft = totalDays - daysElapsed;

  const currentMonthByCategory = {};
  transactions.forEach((t) => {
    if (
      t.amount > 0 &&
      t.category !== "Finance & Fees" &&
      t.date.getFullYear() === year &&
      t.date.getMonth() === month
    ) {
      currentMonthByCategory[t.category] = (currentMonthByCategory[t.category] || 0) + t.amount;
    }
  });

  return Object.entries(budgets)
    .map(([category, budget]) => {
      const actual = currentMonthByCategory[category] || 0;
      const projected = daysElapsed > 0 ? (actual / daysElapsed) * totalDays : 0;
      const overage = projected - budget;
      return {
        category,
        budget,
        actual,
        projected,
        daysLeft,
        daysElapsed,
        totalDays,
        overage,
        willExceed: overage > 0,
        severity: overage > budget * 0.2 ? "high" : "medium",
      };
    })
    .filter((p) => p.actual > 0 && p.willExceed)
    .sort((a, b) => b.overage - a.overage);
}

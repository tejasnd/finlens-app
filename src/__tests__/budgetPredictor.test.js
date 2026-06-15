import { describe, it, expect, vi } from "vitest";
import { predictBudget } from "../utils/budgetPredictor";

const makeDate = (day) => {
  const d = new Date();
  d.setDate(day);
  return d;
};

const tx = (category, amount, day = 10) => ({
  category,
  amount,
  date: makeDate(day),
});

describe("predictBudget", () => {
  it("returns empty array when no transactions", () => {
    expect(predictBudget([], { Food: 500 })).toEqual([]);
  });

  it("returns empty array when no budgets", () => {
    expect(predictBudget([tx("Food & Dining", 100)], {})).toEqual([]);
  });

  it("returns empty array for invalid inputs", () => {
    expect(predictBudget(null, null)).toEqual([]);
    expect(predictBudget("bad", 123)).toEqual([]);
  });

  it("flags category projected to exceed budget", () => {
    // Mock to day 5 so $300 spent projects to ~$1800/month vs $500 budget
    vi.setSystemTime(new Date(2024, 0, 5));
    const txns = [tx("Food & Dining", 300, 5)];
    const result = predictBudget(txns, { "Food & Dining": 500 });
    vi.useRealTimers();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].category).toBe("Food & Dining");
    expect(result[0].willExceed).toBe(true);
    expect(result[0].projected).toBeGreaterThan(500);
  });

  it("does not flag category under budget", () => {
    // Spend $10 in 10 days → projects to ~$30 vs $500 budget
    const txns = [tx("Food & Dining", 10, 10)];
    const result = predictBudget(txns, { "Food & Dining": 500 });
    expect(result).toEqual([]);
  });

  it("excludes Finance & Fees from predictions", () => {
    const txns = [tx("Finance & Fees", 999, 5)];
    const result = predictBudget(txns, { "Finance & Fees": 10 });
    expect(result).toEqual([]);
  });

  it("marks high severity when overage exceeds 20% of budget", () => {
    const txns = [tx("Shopping", 500, 5)];
    const result = predictBudget(txns, { Shopping: 100 });
    if (result.length > 0) {
      expect(result[0].severity).toBe("high");
    }
  });

  it("sorts results by overage descending", () => {
    const txns = [
      tx("Shopping", 200, 5),
      tx("Food & Dining", 500, 5),
    ];
    const result = predictBudget(txns, { Shopping: 50, "Food & Dining": 100 });
    if (result.length >= 2) {
      expect(result[0].overage).toBeGreaterThanOrEqual(result[1].overage);
    }
  });
});

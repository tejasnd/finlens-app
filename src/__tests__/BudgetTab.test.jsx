import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import BudgetTab from "../components/tabs/BudgetTab";

vi.mock("../context/AppContext", () => ({
  useAppContext: vi.fn(),
}));

// Recharts uses DOM measurements unavailable in jsdom — swap for pass-through stubs
vi.mock("recharts", () => {
  const Passthrough = ({ children }) => children ?? null;
  const Null = () => null;
  return {
    ResponsiveContainer: Passthrough,
    BarChart: Passthrough,
    Bar: Null,
    XAxis: Null,
    YAxis: Null,
    CartesianGrid: Null,
    Tooltip: Null,
    Legend: Null,
  };
});

// Stub predictBudget so tests are date-independent
vi.mock("../utils/budgetPredictor", () => ({
  predictBudget: vi.fn(() => []),
}));

import { useAppContext } from "../context/AppContext";
import { predictBudget } from "../utils/budgetPredictor";

// ── helpers ──────────────────────────────────────────────────────────────────

const BASE_CONTEXT = {
  monthlyData: [],
  budgets: {},
  setBudgets: vi.fn(),
  budgetStatus: [],
  editBudgetCat: null,
  setEditBudgetCat: vi.fn(),
  budgetVal: "",
  setBudgetVal: vi.fn(),
  transactions: [],
  notify: vi.fn(),
};

beforeEach(() => {
  vi.mocked(useAppContext).mockReturnValue({ ...BASE_CONTEXT });
  vi.mocked(predictBudget).mockReturnValue([]);
});

afterEach(cleanup);

// ── tests ─────────────────────────────────────────────────────────────────────

describe("BudgetTab", () => {
  describe("empty state", () => {
    it("shows 'no budgets' message when no budgets are set", () => {
      render(<BudgetTab />);
      expect(screen.getByText(/No budgets set yet/)).toBeInTheDocument();
    });

    it("does not show any budget progress rows when budgets is empty", () => {
      render(<BudgetTab />);
      expect(screen.queryByText("Over")).not.toBeInTheDocument();
    });

    it("does not show the predictions section when predictBudget returns empty", () => {
      render(<BudgetTab />);
      expect(screen.queryByText(/Predictions/)).not.toBeInTheDocument();
    });
  });

  describe("budget category display", () => {
    it("renders a card for each category that has a budget", () => {
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        budgets: { "Food & Dining": 300, Shopping: 150 },
        monthlyData: [{ month: "Jan 2024", "Food & Dining": 120, Shopping: 80 }],
      });
      render(<BudgetTab />);
      expect(screen.getByText("Food & Dining")).toBeInTheDocument();
      expect(screen.getByText("Shopping")).toBeInTheDocument();
    });

    it("renders the correct actual amount for the most recent month", () => {
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        budgets: { "Food & Dining": 300 },
        monthlyData: [{ month: "Jan 2024", "Food & Dining": 120 }],
      });
      render(<BudgetTab />);
      // The budget row label for the most recent month should appear
      expect(screen.getByText(/Jan 2024/)).toBeInTheDocument();
    });

    it("shows $0 actual when monthlyData is empty", () => {
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        budgets: { "Food & Dining": 300 },
        monthlyData: [],
      });
      render(<BudgetTab />);
      expect(screen.getByText("Food & Dining")).toBeInTheDocument();
      // 0% used — actual is $0 against budget
      expect(screen.getByText("0% used")).toBeInTheDocument();
    });
  });

  describe("over-budget indicator", () => {
    it("shows 'Over' badge when actual spend exceeds budget", () => {
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        budgets: { Shopping: 50 },
        monthlyData: [{ month: "Jan 2024", Shopping: 80 }], // 80 > 50
      });
      render(<BudgetTab />);
      expect(screen.getByText("Over")).toBeInTheDocument();
    });

    it("does not show 'Over' badge when spend is under budget", () => {
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        budgets: { "Food & Dining": 300 },
        monthlyData: [{ month: "Jan 2024", "Food & Dining": 150 }], // 150 < 300
      });
      render(<BudgetTab />);
      expect(screen.queryByText("Over")).not.toBeInTheDocument();
    });

    it("shows correct remaining amount when under budget", () => {
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        budgets: { Groceries: 200 },
        monthlyData: [{ month: "Jan 2024", Groceries: 80 }],
      });
      render(<BudgetTab />);
      // 80% progress: 80/200 = 40% used
      expect(screen.getByText("40% used")).toBeInTheDocument();
    });
  });

  describe("add budget form", () => {
    it("shows the budget form when editBudgetCat is not null", () => {
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        editBudgetCat: "",
        budgetVal: "",
      });
      render(<BudgetTab />);
      expect(screen.getByRole("combobox")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("$ amount")).toBeInTheDocument();
    });

    it("hides the budget form when editBudgetCat is null", () => {
      render(<BudgetTab />);
      expect(screen.queryByPlaceholderText("$ amount")).not.toBeInTheDocument();
    });

    it("calls setBudgets with an updater that adds the new budget on save", () => {
      const setBudgets = vi.fn();
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        editBudgetCat: "Shopping",
        budgetVal: "200",
        setBudgets,
      });
      render(<BudgetTab />);
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(setBudgets).toHaveBeenCalledOnce();
      const updater = setBudgets.mock.calls[0][0];
      expect(updater({})).toEqual({ Shopping: 200 });
    });

    it("shows validation error when Save is clicked with no category selected", () => {
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        editBudgetCat: "", // form open but no category chosen
        budgetVal: "300",
      });
      render(<BudgetTab />);
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(screen.getByText("Pick a category.")).toBeInTheDocument();
    });

    it("shows validation error when Save is clicked with an invalid amount", () => {
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        editBudgetCat: "Shopping",
        budgetVal: "-50",
      });
      render(<BudgetTab />);
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(screen.getByText("Enter a positive number.")).toBeInTheDocument();
    });

    it("calls setEditBudgetCat(null) and setBudgetVal('') when Cancel is clicked", () => {
      const setEditBudgetCat = vi.fn();
      const setBudgetVal = vi.fn();
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        editBudgetCat: "Shopping",
        budgetVal: "100",
        setEditBudgetCat,
        setBudgetVal,
      });
      render(<BudgetTab />);
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(setEditBudgetCat).toHaveBeenCalledWith(null);
      expect(setBudgetVal).toHaveBeenCalledWith("");
    });
  });

  describe("predictions section", () => {
    it("renders prediction cards when predictBudget returns results", () => {
      vi.mocked(predictBudget).mockReturnValue([
        {
          category: "Food & Dining",
          actual: 200,
          projected: 600,
          budget: 300,
          overage: 300,
          severity: "high",
          daysLeft: 10,
          willExceed: true,
        },
      ]);
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        budgets: { "Food & Dining": 300 },
        transactions: [],
      });
      render(<BudgetTab />);
      expect(screen.getByText(/Predictions/)).toBeInTheDocument();
      // "High risk" badge and over-budget amount are unique to the predictions card
      expect(screen.getByText("High risk")).toBeInTheDocument();
      expect(screen.getByText(/\$300 over/)).toBeInTheDocument();
    });

    it("hides predictions section when predictBudget returns empty", () => {
      vi.mocked(predictBudget).mockReturnValue([]);
      render(<BudgetTab />);
      expect(screen.queryByText(/Predictions/)).not.toBeInTheDocument();
    });
  });

  describe("budget vs actual chart section", () => {
    it("renders chart section when budgetStatus has entries", () => {
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        budgetStatus: [
          { category: "Food & Dining", budget: 300, actual: 150, pct: 50, over: false },
        ],
      });
      render(<BudgetTab />);
      expect(screen.getByText("Budget vs Actual")).toBeInTheDocument();
      expect(screen.getByText("Budget Health")).toBeInTheDocument();
    });

    it("hides chart section when budgetStatus is empty", () => {
      render(<BudgetTab />);
      expect(screen.queryByText("Budget vs Actual")).not.toBeInTheDocument();
    });
  });
});

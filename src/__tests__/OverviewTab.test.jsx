import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import OverviewTab from "../components/tabs/OverviewTab";
import { fmt } from "../utils/formatters";

vi.mock("../context/AppContext", () => ({
  useAppContext: vi.fn(),
}));

// Pie/Cell are rendered as pass-through + identifiable stub so segment count is testable.
// All other chart primitives render null to avoid SVG measurement errors in jsdom.
vi.mock("recharts", () => {
  const Passthrough = ({ children }) => children ?? null;
  const Null = () => null;
  return {
    ResponsiveContainer: Passthrough,
    PieChart: Passthrough,
    Pie: Passthrough,
    Cell: ({ fill }) => <span data-testid="pie-segment" data-fill={fill} />,
    Tooltip: Null,
    Legend: Null,
  };
});

import { useAppContext } from "../context/AppContext";

// ── helpers ──────────────────────────────────────────────────────────────────

const CAT_TOTALS = [
  { name: "Food & Dining", value: 800 },
  { name: "Shopping",      value: 350 },
  { name: "Transport",     value: 175 },
];

const TOP_MERCHANTS = [
  { name: "Whole Foods", total: 500, count: 5, category: "Groceries" },
  { name: "Amazon",      total: 260, count: 3, category: "Shopping" },
  { name: "Starbucks",   total: 130, count: 8, category: "Entertainment" },
];

// totalSpend=1200, spendOnly=4 → Avg/Txn = $300 (distinct from all cat/merchant values)
const BASE_CONTEXT = {
  totalSpend:   1200,
  avgMonthly:   600,
  filtered:     Array.from({ length: 5 }, (_, i) => ({ id: `tx-${i}` })),
  spendOnly:    Array.from({ length: 4 }, (_, i) => ({ id: `s-${i}` })),
  catTotals:    CAT_TOTALS,
  topMerchants: TOP_MERCHANTS,
};

// Helpers to scope queries to a specific section by its card title
function breakdownSection() {
  return screen.getByText("Category Breakdown").closest(".card");
}
function merchantSection() {
  return screen.getByText("Top 10 Merchants").closest(".card");
}

beforeEach(() => {
  vi.mocked(useAppContext).mockReturnValue({ ...BASE_CONTEXT });
});

afterEach(cleanup);

// ── tests ─────────────────────────────────────────────────────────────────────

describe("OverviewTab", () => {
  describe("stat cards", () => {
    it("renders all four stat card labels", () => {
      render(<OverviewTab />);
      expect(screen.getByText("Total Spent")).toBeInTheDocument();
      expect(screen.getByText("Avg / Month")).toBeInTheDocument();
      expect(screen.getByText("Transactions")).toBeInTheDocument();
      expect(screen.getByText("Avg / Txn")).toBeInTheDocument();
    });

    it("shows the correct Total Spent value", () => {
      render(<OverviewTab />);
      const card = screen.getByText("Total Spent").closest(".stat");
      expect(within(card).getByText(fmt(1200))).toBeInTheDocument();
    });

    it("shows the correct Avg / Month value", () => {
      render(<OverviewTab />);
      const card = screen.getByText("Avg / Month").closest(".stat");
      expect(within(card).getByText(fmt(600))).toBeInTheDocument();
    });

    it("shows the transaction count from filtered.length", () => {
      render(<OverviewTab />);
      const card = screen.getByText("Transactions").closest(".stat");
      expect(within(card).getByText("5")).toBeInTheDocument();
    });

    it("shows the correct Avg / Txn value", () => {
      render(<OverviewTab />);
      const card = screen.getByText("Avg / Txn").closest(".stat");
      // 1200 / 4 = 300
      expect(within(card).getByText(fmt(300))).toBeInTheDocument();
    });
  });

  describe("zero-transaction edge cases", () => {
    it("renders without errors when all data is empty", () => {
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        totalSpend:   0,
        avgMonthly:   0,
        filtered:     [],
        spendOnly:    [],
        catTotals:    [],
        topMerchants: [],
      });
      expect(() => render(<OverviewTab />)).not.toThrow();
    });

    it("shows $0 for Avg / Txn when spendOnly is empty (guards against divide-by-zero)", () => {
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        totalSpend: 0,
        spendOnly:  [],
        filtered:   [],
      });
      render(<OverviewTab />);
      const card = screen.getByText("Avg / Txn").closest(".stat");
      expect(within(card).getByText(fmt(0))).toBeInTheDocument();
    });

    it("shows 0 transaction count when filtered is empty", () => {
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        filtered:  [],
        spendOnly: [],
      });
      render(<OverviewTab />);
      const card = screen.getByText("Transactions").closest(".stat");
      expect(within(card).getByText("0")).toBeInTheDocument();
    });
  });

  describe("pie chart segments", () => {
    it("renders one segment per catTotals entry", () => {
      render(<OverviewTab />);
      expect(screen.getAllByTestId("pie-segment")).toHaveLength(CAT_TOTALS.length);
    });

    it("renders zero segments when catTotals is empty", () => {
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        catTotals: [],
      });
      render(<OverviewTab />);
      expect(screen.queryAllByTestId("pie-segment")).toHaveLength(0);
    });

    it("passes a fill color attribute to each segment", () => {
      render(<OverviewTab />);
      for (const seg of screen.getAllByTestId("pie-segment")) {
        expect(seg.getAttribute("data-fill")).toBeTruthy();
      }
    });
  });

  describe("category breakdown", () => {
    it("renders a row for each category in catTotals", () => {
      render(<OverviewTab />);
      const section = breakdownSection();
      expect(within(section).getByText("Food & Dining")).toBeInTheDocument();
      expect(within(section).getByText("Shopping")).toBeInTheDocument();
      expect(within(section).getByText("Transport")).toBeInTheDocument();
    });

    it("renders the correct count of category rows", () => {
      render(<OverviewTab />);
      const section = breakdownSection();
      // Each category renders one element with the category name
      expect(within(section).getAllByText(/^(Food & Dining|Shopping|Transport)$/))
        .toHaveLength(CAT_TOTALS.length);
    });

    it("renders formatted amounts for each category", () => {
      render(<OverviewTab />);
      const section = breakdownSection();
      expect(within(section).getByText(fmt(800))).toBeInTheDocument();
      expect(within(section).getByText(fmt(350))).toBeInTheDocument();
      expect(within(section).getByText(fmt(175))).toBeInTheDocument();
    });

    it("renders nothing in the breakdown when catTotals is empty", () => {
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        catTotals: [],
      });
      render(<OverviewTab />);
      const section = breakdownSection();
      // No category name elements should be in the breakdown
      expect(within(section).queryByText("Food & Dining")).not.toBeInTheDocument();
    });
  });

  describe("top merchants list", () => {
    it("renders a tile for each top merchant", () => {
      render(<OverviewTab />);
      expect(screen.getByText("Whole Foods")).toBeInTheDocument();
      expect(screen.getByText("Amazon")).toBeInTheDocument();
      expect(screen.getByText("Starbucks")).toBeInTheDocument();
    });

    it("shows rank numbers in order (#1, #2, #3)", () => {
      render(<OverviewTab />);
      const section = merchantSection();
      expect(within(section).getByText("#1")).toBeInTheDocument();
      expect(within(section).getByText("#2")).toBeInTheDocument();
      expect(within(section).getByText("#3")).toBeInTheDocument();
    });

    it("shows merchants in the same order as topMerchants from context", () => {
      render(<OverviewTab />);
      const ranks = screen.getAllByText(/^#\d+$/);
      // Rank labels appear in DOM order matching topMerchants array
      expect(ranks[0].textContent).toBe("#1");
      expect(ranks[1].textContent).toBe("#2");
      expect(ranks[2].textContent).toBe("#3");
    });

    it("shows the transaction count for each merchant", () => {
      render(<OverviewTab />);
      const section = merchantSection();
      expect(within(section).getByText(/5 txns/)).toBeInTheDocument();
      expect(within(section).getByText(/3 txns/)).toBeInTheDocument();
      expect(within(section).getByText(/8 txns/)).toBeInTheDocument();
    });

    it("shows formatted total spend for each merchant", () => {
      render(<OverviewTab />);
      const section = merchantSection();
      expect(within(section).getByText(fmt(500))).toBeInTheDocument();
      expect(within(section).getByText(fmt(260))).toBeInTheDocument();
      expect(within(section).getByText(fmt(130))).toBeInTheDocument();
    });

    it("renders nothing when topMerchants is empty", () => {
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        topMerchants: [],
      });
      render(<OverviewTab />);
      expect(screen.queryByText("#1")).not.toBeInTheDocument();
    });
  });
});

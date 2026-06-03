import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import MonthlyTab from "../components/tabs/MonthlyTab";
import { fmt } from "../utils/formatters";

vi.mock("../context/AppContext", () => ({
  useAppContext: vi.fn(),
}));

vi.mock("recharts", () => {
  const Passthrough = ({ children }) => children ?? null;
  const Null = () => null;
  return {
    ResponsiveContainer: Passthrough,
    LineChart: Passthrough,
    BarChart: Passthrough,
    Line: Null,
    Bar: Null,
    XAxis: Null,
    YAxis: Null,
    CartesianGrid: Null,
    Tooltip: Null,
    Legend: Null,
  };
});

import { useAppContext } from "../context/AppContext";

// ── helpers ──────────────────────────────────────────────────────────────────

const PERSON_A = { name: "Alice", color: "#6C5CE7" };
const PERSON_B = { name: "Bob",   color: "#00B894" };

// All values are deliberately distinct across the entire table to avoid getByText collisions.
const MONTHLY_DATA = [
  {
    month: "Jan 2024",
    total: 1230,
    personA: 820,
    personB: 410,
    "Food & Dining": 315,
    Shopping: 210,
  },
  {
    month: "Feb 2024",
    total: 875,
    personA: 475,
    personB: 400,
    // No "Food & Dining" → cell should show "—"
    Shopping: 155,
  },
  {
    month: "Mar 2024",
    total: 1490,
    personA: 940,
    personB: 550,
    "Food & Dining": 390,
    Shopping: 290,
  },
];

const CAT_TOTALS = [
  { name: "Food & Dining", value: 700 },
  { name: "Shopping",      value: 650 },
];

const BASE_CONTEXT = {
  monthlyData: MONTHLY_DATA,
  catTotals:   CAT_TOTALS,
  personA:     PERSON_A,
  personB:     PERSON_B,
};

// Returns the breakdown table element
function table() {
  return screen.getByText("Monthly Breakdown Table").closest(".card").querySelector("table");
}

// Returns all data rows (excludes the header row)
function dataRows() {
  return Array.from(table().querySelectorAll("tbody tr"));
}

beforeEach(() => {
  vi.mocked(useAppContext).mockReturnValue({ ...BASE_CONTEXT });
});

afterEach(cleanup);

// ── tests ─────────────────────────────────────────────────────────────────────

describe("MonthlyTab", () => {
  describe("table structure", () => {
    it("renders one data row per month in monthlyData", () => {
      render(<MonthlyTab />);
      expect(dataRows()).toHaveLength(MONTHLY_DATA.length);
    });

    it("renders only the header row when monthlyData is empty", () => {
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        monthlyData: [],
      });
      render(<MonthlyTab />);
      expect(dataRows()).toHaveLength(0);
      // Header row still present
      expect(table().querySelectorAll("thead tr")).toHaveLength(1);
    });

    it("shows personA and personB names as column headers", () => {
      render(<MonthlyTab />);
      const tbl = table();
      expect(within(tbl).getByText("Alice")).toBeInTheDocument();
      expect(within(tbl).getByText("Bob")).toBeInTheDocument();
    });

    it("shows the first word of each catTotals category as a column header", () => {
      render(<MonthlyTab />);
      const header = table().querySelector("thead tr");
      // "Food & Dining" → "Food", "Shopping" → "Shopping"
      expect(within(header).getByText("Food")).toBeInTheDocument();
      expect(within(header).getByText("Shopping")).toBeInTheDocument();
    });
  });

  describe("month rows", () => {
    it("renders each month label in its own row", () => {
      render(<MonthlyTab />);
      expect(screen.getByText("Jan 2024")).toBeInTheDocument();
      expect(screen.getByText("Feb 2024")).toBeInTheDocument();
      expect(screen.getByText("Mar 2024")).toBeInTheDocument();
    });

    it("renders months in the order supplied by context (chronological)", () => {
      render(<MonthlyTab />);
      const rows = dataRows();
      expect(rows[0].textContent).toContain("Jan 2024");
      expect(rows[1].textContent).toContain("Feb 2024");
      expect(rows[2].textContent).toContain("Mar 2024");
    });

    it("order reflects whatever sequence context provides (reverse order)", () => {
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        monthlyData: [...MONTHLY_DATA].reverse(),
      });
      render(<MonthlyTab />);
      const rows = dataRows();
      expect(rows[0].textContent).toContain("Mar 2024");
      expect(rows[1].textContent).toContain("Feb 2024");
      expect(rows[2].textContent).toContain("Jan 2024");
    });
  });

  describe("total column", () => {
    it("shows each month's total in its correct row", () => {
      render(<MonthlyTab />);
      const rows = dataRows();
      expect(rows[0].textContent).toContain(fmt(1230)); // Jan
      expect(rows[1].textContent).toContain(fmt(875));  // Feb
      expect(rows[2].textContent).toContain(fmt(1490)); // Mar
    });
  });

  describe("person columns", () => {
    it("shows personA spend in the correct row for each month", () => {
      render(<MonthlyTab />);
      const rows = dataRows();
      expect(rows[0].textContent).toContain(fmt(820));  // Jan personA
      expect(rows[1].textContent).toContain(fmt(475));  // Feb personA
      expect(rows[2].textContent).toContain(fmt(940));  // Mar personA
    });

    it("shows personB spend in the correct row for each month", () => {
      render(<MonthlyTab />);
      const rows = dataRows();
      expect(rows[0].textContent).toContain(fmt(410));  // Jan personB
      expect(rows[1].textContent).toContain(fmt(400));  // Feb personB
      expect(rows[2].textContent).toContain(fmt(550));  // Mar personB
    });
  });

  describe("category cells", () => {
    it("shows category spend when a value exists", () => {
      render(<MonthlyTab />);
      const rows = dataRows();
      // Jan 2024 has Food & Dining = 315
      expect(rows[0].textContent).toContain(fmt(MONTHLY_DATA[0]["Food & Dining"]));
    });

    it("shows '—' when a category has no spend for that month", () => {
      render(<MonthlyTab />);
      const rows = dataRows();
      // Feb 2024 has no "Food & Dining" → should render "—"
      expect(rows[1].textContent).toContain("—");
    });

    it("does not show '—' for a month that has spend in all tracked categories", () => {
      render(<MonthlyTab />);
      const rows = dataRows();
      // Mar 2024 has both Food & Dining and Shopping
      expect(rows[2].textContent).not.toContain("—");
    });
  });

  describe("chart sections", () => {
    it("renders the Monthly Trend card", () => {
      render(<MonthlyTab />);
      expect(screen.getByText("Monthly Trend")).toBeInTheDocument();
    });

    it("renders the Monthly by Category (Stacked) card", () => {
      render(<MonthlyTab />);
      expect(screen.getByText("Monthly by Category (Stacked)")).toBeInTheDocument();
    });

    it("renders the breakdown table card", () => {
      render(<MonthlyTab />);
      expect(screen.getByText("Monthly Breakdown Table")).toBeInTheDocument();
    });
  });
});

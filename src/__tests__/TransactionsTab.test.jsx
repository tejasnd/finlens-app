import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import TransactionsTab from "../components/tabs/TransactionsTab";
import { TX_PER_PAGE } from "../constants";

vi.mock("../context/AppContext", () => ({
  useAppContext: vi.fn(),
}));

vi.mock("../services/excelExport", () => ({
  exportToExcel: vi.fn(),
}));

import { useAppContext } from "../context/AppContext";

// ── helpers ──────────────────────────────────────────────────────────────────

function makeTx(count, overrides = {}) {
  return Array.from({ length: count }, (_, i) => ({
    id: `tx-${i}`,
    date: new Date(2024, 0, (i % 28) + 1),
    description: `Merchant ${i}`,
    owner: "Alice",
    amount: (i + 1) * 10,
    category: "Food & Dining",
    splitType: "personal",
    ...overrides,
  }));
}

const BASE_CONTEXT = {
  filtered: [],
  transactions: [],
  splitPct: { A: 50, B: 50 },
  personA: { name: "Alice", color: "#6C5CE7" },
  personB: { name: "Bob",   color: "#00B894" },
  editId: null,
  setEditId: vi.fn(),
  sortConfig: { key: null, direction: "asc" },
  handleSort: vi.fn(),
  txPage: 1,
  setTxPage: vi.fn(),
  updateCategory: vi.fn(),
  updateSplitType: vi.fn(),
  deleteTransaction: vi.fn(),
};

beforeEach(() => {
  vi.mocked(useAppContext).mockReturnValue({ ...BASE_CONTEXT });
});

afterEach(cleanup);

// ── tests ─────────────────────────────────────────────────────────────────────

describe("TransactionsTab", () => {
  describe("empty state", () => {
    it("shows 0 results when filtered is empty", () => {
      render(<TransactionsTab />);
      expect(screen.getByText("0 results")).toBeInTheDocument();
    });

    it("renders only the header row when filtered is empty", () => {
      render(<TransactionsTab />);
      // getAllByRole('row') includes only the single <thead> row when tbody is empty
      expect(screen.getAllByRole("row")).toHaveLength(1);
    });

    it("does not render pagination when there are no transactions", () => {
      render(<TransactionsTab />);
      expect(screen.queryByText(/← Prev/)).not.toBeInTheDocument();
    });
  });

  describe("transaction rows", () => {
    it("renders a row for each transaction in the filtered set", () => {
      const txns = makeTx(3);
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        filtered: txns,
        transactions: txns,
      });
      render(<TransactionsTab />);
      expect(screen.getByText("Merchant 0")).toBeInTheDocument();
      expect(screen.getByText("Merchant 1")).toBeInTheDocument();
      expect(screen.getByText("Merchant 2")).toBeInTheDocument();
    });

    it("shows the correct results count", () => {
      const txns = makeTx(7);
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        filtered: txns,
        transactions: txns,
      });
      render(<TransactionsTab />);
      expect(screen.getByText("7 results")).toBeInTheDocument();
    });

    it("displays owner badge for each transaction row", () => {
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        filtered: makeTx(3),
        transactions: makeTx(3),
      });
      render(<TransactionsTab />);
      // 3 rows, each with an "Alice" badge
      expect(screen.getAllByText("Alice")).toHaveLength(3);
    });
  });

  describe("filtered results (simulates search)", () => {
    it("displays only the filtered subset and ignores the rest", () => {
      const all = makeTx(5);
      const filtered = all.slice(0, 2); // as if search matched 2 of 5
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        filtered,
        transactions: all,
      });
      render(<TransactionsTab />);
      expect(screen.getByText("2 results")).toBeInTheDocument();
      expect(screen.getByText("Merchant 0")).toBeInTheDocument();
      expect(screen.getByText("Merchant 1")).toBeInTheDocument();
      expect(screen.queryByText("Merchant 2")).not.toBeInTheDocument();
    });
  });

  describe("pagination", () => {
    it("renders exactly TX_PER_PAGE data rows when filtered exceeds the limit", () => {
      const txns = makeTx(TX_PER_PAGE + 5);
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        filtered: txns,
        transactions: txns,
        txPage: 1,
      });
      render(<TransactionsTab />);
      // 1 header row + TX_PER_PAGE data rows
      expect(screen.getAllByRole("row")).toHaveLength(TX_PER_PAGE + 1);
    });

    it("shows pagination controls when filtered exceeds TX_PER_PAGE", () => {
      const txns = makeTx(TX_PER_PAGE + 5);
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        filtered: txns,
        transactions: txns,
        txPage: 1,
      });
      render(<TransactionsTab />);
      expect(screen.getByRole("button", { name: /← Prev/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Next →/ })).toBeInTheDocument();
    });

    it("shows the correct page count label", () => {
      const txns = makeTx(TX_PER_PAGE + 5);
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        filtered: txns,
        transactions: txns,
        txPage: 1,
      });
      render(<TransactionsTab />);
      expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();
    });

    it("prev button is disabled on the first page", () => {
      const txns = makeTx(TX_PER_PAGE + 5);
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        filtered: txns,
        transactions: txns,
        txPage: 1,
      });
      render(<TransactionsTab />);
      expect(screen.getByRole("button", { name: /← Prev/ })).toBeDisabled();
    });

    it("next button is disabled on the last page", () => {
      const txns = makeTx(TX_PER_PAGE + 5);
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        filtered: txns,
        transactions: txns,
        txPage: 2,
      });
      render(<TransactionsTab />);
      expect(screen.getByRole("button", { name: /Next →/ })).toBeDisabled();
    });

    it("next button calls setTxPage with an incrementing updater", () => {
      const setTxPage = vi.fn();
      const txns = makeTx(TX_PER_PAGE + 5);
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        filtered: txns,
        transactions: txns,
        txPage: 1,
        setTxPage,
      });
      render(<TransactionsTab />);
      fireEvent.click(screen.getByRole("button", { name: /Next →/ }));
      expect(setTxPage).toHaveBeenCalledOnce();
      const updater = setTxPage.mock.calls[0][0];
      expect(updater(1)).toBe(2);
    });

    it("prev button calls setTxPage with a decrementing updater", () => {
      const setTxPage = vi.fn();
      const txns = makeTx(TX_PER_PAGE + 5);
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        filtered: txns,
        transactions: txns,
        txPage: 2,
        setTxPage,
      });
      render(<TransactionsTab />);
      fireEvent.click(screen.getByRole("button", { name: /← Prev/ }));
      expect(setTxPage).toHaveBeenCalledOnce();
      const updater = setTxPage.mock.calls[0][0];
      expect(updater(2)).toBe(1);
    });

    it("shows correct rows for page 2", () => {
      const txns = makeTx(TX_PER_PAGE + 3);
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        filtered: txns,
        transactions: txns,
        txPage: 2,
      });
      render(<TransactionsTab />);
      // Page 2 starts at index TX_PER_PAGE
      expect(screen.getByText(`Merchant ${TX_PER_PAGE}`)).toBeInTheDocument();
      expect(screen.queryByText("Merchant 0")).not.toBeInTheDocument();
    });

    it("hides pagination when all transactions fit on one page", () => {
      const txns = makeTx(TX_PER_PAGE);
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        filtered: txns,
        transactions: txns,
      });
      render(<TransactionsTab />);
      expect(screen.queryByText(/← Prev/)).not.toBeInTheDocument();
    });
  });

  describe("delete interaction", () => {
    it("calls deleteTransaction with the correct id after confirming", () => {
      const deleteTransaction = vi.fn();
      const txns = makeTx(1);
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        filtered: txns,
        transactions: txns,
        deleteTransaction,
      });
      render(<TransactionsTab />);

      // First click arms ConfirmButton (shows "Yes" / "No")
      fireEvent.click(screen.getByText("🗑️"));
      // Second click confirms deletion
      fireEvent.click(screen.getByRole("button", { name: "Yes" }));

      expect(deleteTransaction).toHaveBeenCalledOnce();
      expect(deleteTransaction).toHaveBeenCalledWith("tx-0");
    });

    it("does not call deleteTransaction when cancel is clicked", () => {
      const deleteTransaction = vi.fn();
      const txns = makeTx(1);
      vi.mocked(useAppContext).mockReturnValue({
        ...BASE_CONTEXT,
        filtered: txns,
        transactions: txns,
        deleteTransaction,
      });
      render(<TransactionsTab />);

      fireEvent.click(screen.getByText("🗑️"));
      fireEvent.click(screen.getByRole("button", { name: "No" }));

      expect(deleteTransaction).not.toHaveBeenCalled();
    });
  });
});

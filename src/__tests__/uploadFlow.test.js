/**
 * Integration test for the file upload flow.
 *
 * Exercises the real parseFile → smartCategory pipeline end-to-end.
 * AI categorization (smartCategoryAI) is intentionally bypassed: no API key
 * is set in localStorage so hasAIKey() returns false and the AI path is skipped.
 *
 * Deduplication is tested by replaying the exact id-based Set merge from doFiles
 * without involving React state.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { parseFile } from "../services/fileParser";
import { SHARED_CATS } from "../constants";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = join(__dirname, "fixtures", "sample-transactions.csv");

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a File object from raw content with a fixed lastModified so the
 * fileFingerprint (name-size-lastModified) is deterministic across test runs.
 */
function makeFile(content, name, lastModified = 1_704_067_200_000) {
  return new File([content], name, { type: "text/csv", lastModified });
}

/**
 * Mirrors the deduplication logic inside doFiles in useAppState:
 *   const ids = new Set(prev.map(t => t.id));
 *   const added = incoming.filter(t => !ids.has(t.id));
 *   return [...prev, ...added];
 */
function mergeWithDedup(existing, incoming) {
  const ids = new Set(existing.map((t) => t.id));
  const added = incoming.filter((t) => !ids.has(t.id));
  return [...existing, ...added];
}

// CSV content used for the "second different file" tests — kept inline to keep
// the fixture directory focused on the primary format.
const SECOND_CSV = [
  "Transaction Date,Description,Amount",
  "02/01/2024,PANERA BREAD,12.50",
  "02/02/2024,COSTCO WHOLESALE,134.67",
  "02/03/2024,HULU SUBSCRIPTION,7.99",
  "02/04/2024,LYFT RIDE,15.20",
  "02/05/2024,BEST BUY PURCHASE,249.00",
].join("\n");

// ── setup ────────────────────────────────────────────────────────────────────

let fixtureContent;

beforeEach(() => {
  fixtureContent = readFileSync(FIXTURE_PATH, "utf-8");
  // Ensure no stale AI key bleeds between tests
  localStorage.clear();
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe("uploadFlow integration", () => {
  describe("fileParser output shape", () => {
    it("returns one transaction per data row in the CSV", async () => {
      const file = makeFile(fixtureContent, "sample-transactions.csv");
      const txns = await parseFile(file, "Alice");
      // fixture has 15 data rows (header excluded by parser)
      expect(txns).toHaveLength(15);
    });

    it("each transaction has the required shape fields", async () => {
      const file = makeFile(fixtureContent, "sample-transactions.csv");
      const txns = await parseFile(file, "Alice");

      for (const t of txns) {
        expect(t.id).toBeTruthy();
        expect(t.source).toBe("sample-transactions.csv");
        expect(t.owner).toBe("Alice");
        expect(t.date).toBeInstanceOf(Date);
        expect(isNaN(t.date.getTime())).toBe(false);
        expect(typeof t.amount).toBe("number");
        expect(t.amount).toBeGreaterThan(0);
        expect(typeof t.description).toBe("string");
        expect(typeof t.category).toBe("string");
        expect(["personal", "shared"]).toContain(t.splitType);
      }
    });

    it("stamps the correct owner on every transaction", async () => {
      const file = makeFile(fixtureContent, "sample-transactions.csv");
      const txns = await parseFile(file, "Bob");
      expect(txns.every((t) => t.owner === "Bob")).toBe(true);
    });

    it("stamps the correct source filename on every transaction", async () => {
      const file = makeFile(fixtureContent, "sample-transactions.csv");
      const txns = await parseFile(file, "Alice");
      expect(txns.every((t) => t.source === "sample-transactions.csv")).toBe(true);
    });

    it("all parsed dates are valid Date objects from 2024", async () => {
      const file = makeFile(fixtureContent, "sample-transactions.csv");
      const txns = await parseFile(file, "Alice");
      for (const t of txns) {
        expect(t.date.getFullYear()).toBe(2024);
      }
    });
  });

  describe("categorization", () => {
    let txns;
    beforeEach(async () => {
      const file = makeFile(fixtureContent, "sample-transactions.csv");
      txns = await parseFile(file, "Alice");
    });

    const EXPECTED = [
      ["STARBUCKS",         "Food & Dining"],
      ["WHOLE FOODS",       "Groceries"],
      ["NETFLIX",           "Subscriptions"],
      ["AMAZON.COM",        "Shopping"],
      ["SHELL OIL",         "Transport"],
      ["UBER TRIP",         "Transport"],
      ["CVS PHARMACY",      "Health & Medical"],
      ["SPOTIFY",           "Subscriptions"],
      ["CHIPOTLE",          "Food & Dining"],
      ["VERIZON",           "Utilities"],
      ["PLANET FITNESS",    "Health & Medical"],
      ["TARGET STORE",      "Groceries"],
      ["DELTA AIR LINES",   "Travel"],
      ["MCDONALDS",         "Food & Dining"],
      ["HOME DEPOT",        "Home & Living"],
    ];

    it.each(EXPECTED)('"%s" is categorized as "%s"', (keyword, expectedCat) => {
      const match = txns.find((t) =>
        t.description.toUpperCase().includes(keyword.toUpperCase())
      );
      expect(match, `no transaction matching "${keyword}"`).toBeDefined();
      expect(match.category).toBe(expectedCat);
    });

    it("no transaction falls through to 'Other' for known merchants", async () => {
      const others = txns.filter((t) => t.category === "Other");
      expect(others).toHaveLength(0);
    });
  });

  describe("splitType assignment", () => {
    it("shared categories get splitType 'shared'", async () => {
      const file = makeFile(fixtureContent, "sample-transactions.csv");
      const txns = await parseFile(file, "Alice");
      const sharedTxns = txns.filter((t) => SHARED_CATS.includes(t.category));
      expect(sharedTxns.length).toBeGreaterThan(0);
      expect(sharedTxns.every((t) => t.splitType === "shared")).toBe(true);
    });

    it("non-shared categories get splitType 'personal'", async () => {
      const file = makeFile(fixtureContent, "sample-transactions.csv");
      const txns = await parseFile(file, "Alice");
      const personalTxns = txns.filter((t) => !SHARED_CATS.includes(t.category));
      expect(personalTxns.length).toBeGreaterThan(0);
      expect(personalTxns.every((t) => t.splitType === "personal")).toBe(true);
    });
  });

  describe("transaction ID stability", () => {
    it("same file produces identical IDs on every parse", async () => {
      const file1 = makeFile(fixtureContent, "sample-transactions.csv", 1_000);
      const file2 = makeFile(fixtureContent, "sample-transactions.csv", 1_000);
      const [txns1, txns2] = await Promise.all([
        parseFile(file1, "Alice"),
        parseFile(file2, "Alice"),
      ]);
      const ids1 = txns1.map((t) => t.id).sort();
      const ids2 = txns2.map((t) => t.id).sort();
      expect(ids1).toEqual(ids2);
    });

    it("different lastModified produces different IDs", async () => {
      const fileA = makeFile(fixtureContent, "sample-transactions.csv", 1_000);
      const fileB = makeFile(fixtureContent, "sample-transactions.csv", 9_999);
      const [txnsA, txnsB] = await Promise.all([
        parseFile(fileA, "Alice"),
        parseFile(fileB, "Alice"),
      ]);
      const idsA = new Set(txnsA.map((t) => t.id));
      const idsB = new Set(txnsB.map((t) => t.id));
      for (const id of idsB) {
        expect(idsA.has(id)).toBe(false);
      }
    });
  });

  describe("deduplication — same file uploaded twice", () => {
    it("adds zero new transactions when the same file is uploaded again", async () => {
      const file1 = makeFile(fixtureContent, "sample-transactions.csv", 1_000);
      const file2 = makeFile(fixtureContent, "sample-transactions.csv", 1_000);

      const firstBatch = await parseFile(file1, "Alice");
      const secondBatch = await parseFile(file2, "Alice");

      const merged = mergeWithDedup(firstBatch, secondBatch);
      expect(merged).toHaveLength(firstBatch.length);
    });

    it("state is identical after a duplicate upload", async () => {
      const file1 = makeFile(fixtureContent, "sample-transactions.csv", 1_000);
      const file2 = makeFile(fixtureContent, "sample-transactions.csv", 1_000);

      const firstBatch = await parseFile(file1, "Alice");
      const secondBatch = await parseFile(file2, "Alice");

      const merged = mergeWithDedup(firstBatch, secondBatch);
      // IDs and order of original batch are preserved
      expect(merged.map((t) => t.id)).toEqual(firstBatch.map((t) => t.id));
    });
  });

  describe("merging — two different files", () => {
    it("all transactions from both files are present after merge", async () => {
      const file1 = makeFile(fixtureContent, "sample-transactions.csv", 1_000);
      const file2 = makeFile(SECOND_CSV, "bank-export.csv", 1_000);

      const [batch1, batch2] = await Promise.all([
        parseFile(file1, "Alice"),
        parseFile(file2, "Bob"),
      ]);

      const merged = mergeWithDedup(batch1, batch2);
      expect(merged).toHaveLength(batch1.length + batch2.length);
    });

    it("transactions from both files retain their original owner", async () => {
      const file1 = makeFile(fixtureContent, "sample-transactions.csv", 1_000);
      const file2 = makeFile(SECOND_CSV, "bank-export.csv", 1_000);

      const [batch1, batch2] = await Promise.all([
        parseFile(file1, "Alice"),
        parseFile(file2, "Bob"),
      ]);

      const merged = mergeWithDedup(batch1, batch2);
      const aliceTxns = merged.filter((t) => t.owner === "Alice");
      const bobTxns   = merged.filter((t) => t.owner === "Bob");
      expect(aliceTxns).toHaveLength(batch1.length);
      expect(bobTxns).toHaveLength(batch2.length);
    });

    it("all IDs in the merged state are unique", async () => {
      const file1 = makeFile(fixtureContent, "sample-transactions.csv", 1_000);
      const file2 = makeFile(SECOND_CSV, "bank-export.csv", 1_000);

      const [batch1, batch2] = await Promise.all([
        parseFile(file1, "Alice"),
        parseFile(file2, "Bob"),
      ]);

      const merged = mergeWithDedup(batch1, batch2);
      const ids = merged.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("second CSV rows are categorized correctly", async () => {
      const file2 = makeFile(SECOND_CSV, "bank-export.csv", 1_000);
      const txns = await parseFile(file2, "Bob");

      const panera   = txns.find((t) => t.description.includes("PANERA"));
      const costco   = txns.find((t) => t.description.includes("COSTCO"));
      const hulu     = txns.find((t) => t.description.includes("HULU"));
      const lyft     = txns.find((t) => t.description.includes("LYFT"));
      const bestBuy  = txns.find((t) => t.description.includes("BEST BUY"));

      expect(panera?.category).toBe("Food & Dining");
      expect(costco?.category).toBe("Groceries");
      expect(hulu?.category).toBe("Subscriptions");
      expect(lyft?.category).toBe("Transport");
      expect(bestBuy?.category).toBe("Shopping");
    });
  });

  describe("error handling", () => {
    it("rejects with PARSE_ERROR code for unsupported file extensions", async () => {
      const file = makeFile("some,data", "export.txt", 1_000);
      await expect(parseFile(file, "Alice")).rejects.toMatchObject({
        code: "PARSE_ERROR",
      });
    });

    it("error message includes the filename for unsupported extensions", async () => {
      const file = makeFile("some,data", "export.txt", 1_000);
      await expect(parseFile(file, "Alice")).rejects.toMatchObject({
        message: expect.stringContaining("export.txt"),
      });
    });

    it("resolves with an empty array for a CSV with only a header row", async () => {
      const headerOnlyCsv = "Transaction Date,Description,Amount\n";
      const file = makeFile(headerOnlyCsv, "empty.csv", 1_000);
      const txns = await parseFile(file, "Alice");
      expect(txns).toHaveLength(0);
    });

    it("resolves with an empty array for a CSV with no recognisable amount column", async () => {
      const noAmountCsv = "Foo,Bar,Baz\n2024-01-01,Some merchant,N/A\n";
      const file = makeFile(noAmountCsv, "bad-headers.csv", 1_000);
      const txns = await parseFile(file, "Alice");
      expect(txns).toHaveLength(0);
    });
  });
});

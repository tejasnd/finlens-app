import { describe, it, expect } from "vitest";
import { parseDate, parseAmount, guessColumns } from "../utils/parsers";

describe("parseDate", () => {
  it("parses MM/DD/YYYY string", () => {
    const d = parseDate("05/15/2024");
    expect(d).toBeInstanceOf(Date);
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(4); // 0-indexed
    expect(d.getDate()).toBe(15);
  });

  it("parses MM-DD-YY string", () => {
    const d = parseDate("01-03-25");
    expect(d).toBeInstanceOf(Date);
    expect(d.getFullYear()).toBe(2025);
  });

  it("parses Excel serial number", () => {
    // Excel serial 45000 = around 2023
    const d = parseDate(45000);
    expect(d).toBeInstanceOf(Date);
    expect(d.getFullYear()).toBeGreaterThanOrEqual(2023);
  });

  it("returns null for empty input", () => {
    expect(parseDate(null)).toBeNull();
    expect(parseDate("")).toBeNull();
    expect(parseDate(undefined)).toBeNull();
  });

  it("returns null for garbage input", () => {
    expect(parseDate("not-a-date")).toBeNull();
  });

  it("parses ISO date string", () => {
    const d = parseDate("2024-03-20");
    expect(d).toBeInstanceOf(Date);
    expect(d.getFullYear()).toBe(2024);
  });
});

describe("parseAmount", () => {
  it("parses plain number", () => {
    expect(parseAmount(42.5)).toBe(42.5);
  });

  it("strips currency symbols and commas", () => {
    expect(parseAmount("$1,234.56")).toBe(1234.56);
  });

  it("returns absolute value (always positive)", () => {
    expect(parseAmount(-99)).toBe(99);
  });

  it("returns null for empty input", () => {
    expect(parseAmount(null)).toBeNull();
    expect(parseAmount("")).toBeNull();
  });

  it("returns null for non-numeric string", () => {
    expect(parseAmount("N/A")).toBeNull();
  });
});

describe("guessColumns", () => {
  it("identifies standard Chase headers", () => {
    const cols = guessColumns(["Transaction Date", "Description", "Amount"]);
    expect(cols.date).toBe("Transaction Date");
    expect(cols.desc).toBe("Description");
    expect(cols.amount).toBe("Amount");
  });

  it("identifies alternate header names", () => {
    const cols = guessColumns(["Posted Date", "Merchant", "Debit"]);
    expect(cols.date).toBe("Posted Date");
    expect(cols.desc).toBe("Merchant");
    expect(cols.amount).toBe("Debit");
  });

  it("returns null for missing columns", () => {
    const cols = guessColumns(["Foo", "Bar"]);
    expect(cols.date).toBeNull();
    expect(cols.amount).toBeNull();
    expect(cols.desc).toBeNull();
  });

  it("is case-insensitive", () => {
    const cols = guessColumns(["DATE", "DESCRIPTION", "AMOUNT"]);
    expect(cols.date).toBe("DATE");
    expect(cols.desc).toBe("DESCRIPTION");
    expect(cols.amount).toBe("AMOUNT");
  });
});

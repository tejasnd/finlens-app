import { describe, it, expect } from "vitest";
import { smartCategory, applyCustomRules, escapeRegex } from "../utils/categorization";

describe("smartCategory", () => {
  it("categorizes Starbucks as Food & Dining", () => {
    expect(smartCategory("STARBUCKS #1234")).toBe("Food & Dining");
  });

  it("categorizes Walmart as Groceries", () => {
    expect(smartCategory("WALMART SUPERCENTER")).toBe("Groceries");
  });

  it("categorizes Netflix as Subscriptions", () => {
    expect(smartCategory("NETFLIX.COM")).toBe("Subscriptions");
  });

  it("categorizes Uber as Transport", () => {
    expect(smartCategory("UBER TRIP")).toBe("Transport");
  });

  it("categorizes Delta as Travel", () => {
    expect(smartCategory("DELTA AIR LINES")).toBe("Travel");
  });

  it("categorizes CVS as Health & Medical", () => {
    expect(smartCategory("CVS PHARMACY #456")).toBe("Health & Medical");
  });

  it("categorizes Amazon as Shopping", () => {
    expect(smartCategory("AMAZON.COM PURCHASE")).toBe("Shopping");
  });

  it("returns Other for unknown merchant", () => {
    expect(smartCategory("UNKNOWN MERCHANT XYZ")).toBe("Other");
  });

  it("returns Other for empty/null input", () => {
    expect(smartCategory("")).toBe("Other");
    expect(smartCategory(null)).toBe("Other");
  });

  it("is case-insensitive", () => {
    expect(smartCategory("starbucks coffee")).toBe("Food & Dining");
    expect(smartCategory("NETFLIX")).toBe("Subscriptions");
  });
});

describe("applyCustomRules — literal string matching", () => {
  it("matches a plain keyword", () => {
    const rules = [{ keyword: "wholefds", category: "Groceries" }];
    expect(applyCustomRules("WHOLEFDS MKT #123", rules)).toBe("Groceries");
  });

  it("returns null when no rule matches", () => {
    const rules = [{ keyword: "wholefds", category: "Groceries" }];
    expect(applyCustomRules("STARBUCKS STORE 1", rules)).toBeNull();
  });

  it("keyword with a dot (.) is treated as a literal dot, not a regex wildcard", () => {
    // "a.b" as a regex would match "aXb", but as a literal it should not
    const rules = [{ keyword: "a.b", category: "Shopping" }];
    expect(applyCustomRules("aXb payment", rules)).toBeNull();
    expect(applyCustomRules("a.b payment", rules)).toBe("Shopping");
  });

  it("keyword with parentheses does not throw or misfire", () => {
    const rules = [{ keyword: "pay(pal)", category: "Finance & Fees" }];
    expect(applyCustomRules("PAY(PAL) TRANSFER", rules)).toBe("Finance & Fees");
    expect(applyCustomRules("PAYPAL TRANSFER", rules)).toBeNull();
  });

  it("keyword with asterisk (*) matches literally, not as a quantifier", () => {
    const rules = [{ keyword: "3*3", category: "Shopping" }];
    expect(applyCustomRules("ORDER 3*3 GADGET", rules)).toBe("Shopping");
    expect(applyCustomRules("ORDER 333 GADGET", rules)).toBeNull();
  });

  it("keyword with brackets does not throw", () => {
    const rules = [{ keyword: "[store]", category: "Shopping" }];
    expect(applyCustomRules("ACME [STORE] NYC", rules)).toBe("Shopping");
  });

  it("matching is case-insensitive", () => {
    const rules = [{ keyword: "AMAZON", category: "Shopping" }];
    expect(applyCustomRules("amazon.com purchase", rules)).toBe("Shopping");
  });

  it("first matching rule wins", () => {
    const rules = [
      { keyword: "starbucks", category: "Food & Dining" },
      { keyword: "starbucks", category: "Subscriptions" },
    ];
    expect(applyCustomRules("STARBUCKS STORE 1", rules)).toBe("Food & Dining");
  });
});

describe("escapeRegex", () => {
  it("escapes regex metacharacters", () => {
    expect(escapeRegex("a.b+c*d?")).toBe("a\\.b\\+c\\*d\\?");
    expect(escapeRegex("(test)")).toBe("\\(test\\)");
    expect(escapeRegex("[abc]")).toBe("\\[abc\\]");
    expect(escapeRegex("^start$")).toBe("\\^start\\$");
  });

  it("leaves plain strings unchanged", () => {
    expect(escapeRegex("wholefds")).toBe("wholefds");
    expect(escapeRegex("starbucks 1234")).toBe("starbucks 1234");
  });
});

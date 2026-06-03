import { describe, it, expect } from "vitest";
import { calcSettlement } from "../services/settlement";

const tx = (owner, amount, splitType) => ({ owner, amount, splitType });

describe("calcSettlement", () => {
  it("returns zero net when both pay equal shared amounts", () => {
    const txns = [
      tx("Alice", 100, "shared"),
      tx("Bob", 100, "shared"),
    ];
    const result = calcSettlement(txns, { A: 50, B: 50 }, "Alice", "Bob");
    expect(result.net).toBeCloseTo(0);
    expect(result.settlement).toMatch(/settled/i);
  });

  it("Alice pays all shared — Bob owes Alice his share", () => {
    const txns = [tx("Alice", 200, "shared")];
    const result = calcSettlement(txns, { A: 50, B: 50 }, "Alice", "Bob");
    // Alice paid 200, Bob owes 100
    expect(result.bOwes).toBeCloseTo(100);
    expect(result.net).toBeCloseTo(-100); // net < 0 means Bob owes Alice
    expect(result.settlement).toMatch(/Bob owes Alice/i);
  });

  it("uneven split 70/30 — Bob owes less", () => {
    const txns = [tx("Alice", 100, "shared")];
    const result = calcSettlement(txns, { A: 70, B: 30 }, "Alice", "Bob");
    expect(result.bOwes).toBeCloseTo(30);
  });

  it("personal transactions don't affect the other person's balance", () => {
    const txns = [
      tx("Alice", 50, "personal"),
      tx("Bob", 80, "personal"),
    ];
    const result = calcSettlement(txns, { A: 50, B: 50 }, "Alice", "Bob");
    expect(result.aOwes).toBe(0);
    expect(result.bOwes).toBe(0);
    expect(result.net).toBeCloseTo(0);
  });

  it("handles empty transactions", () => {
    const result = calcSettlement([], { A: 50, B: 50 }, "Alice", "Bob");
    expect(result.net).toBe(0);
    expect(result.aPaid).toBe(0);
    expect(result.bPaid).toBe(0);
  });

  it("mixed personal and shared", () => {
    const txns = [
      tx("Alice", 100, "shared"),
      tx("Alice", 40, "personal"),
      tx("Bob", 20, "personal"),
    ];
    const result = calcSettlement(txns, { A: 50, B: 50 }, "Alice", "Bob");
    expect(result.bOwes).toBeCloseTo(50);
    expect(result.aOwes).toBeCloseTo(0);
  });

  it("personal refund to Alice reduces her net paid without affecting Bob", () => {
    // Alice paid $100 shared + got a $30 personal refund (net $70 personal)
    // Bob paid nothing shared
    const txns = [
      tx("Alice", 100, "shared"),
      tx("Alice", -30, "personal"),
    ];
    const result = calcSettlement(txns, { A: 50, B: 50 }, "Alice", "Bob");
    // Alice paid $100 shared → Bob owes $50
    expect(result.bOwes).toBeCloseTo(50);
    // Personal refund only affects aPaid, not the shared settlement
    expect(result.aPaid).toBeCloseTo(100 + (-30)); // 70
    expect(result.aOwes).toBeCloseTo(0);
    expect(result.net).toBeCloseTo(-50); // Bob still owes Alice $50
    expect(result.settlement).toMatch(/Bob owes Alice/i);
  });

  it("shared refund to Bob reduces his net paid and Alice's share obligation", () => {
    // Alice paid $100 shared expense; Bob got a $20 shared refund
    // Net shared spend = $80; at 50/50 each owes $40
    // Alice paid $100 of $80 net → Bob owes Alice $60
    const txns = [
      tx("Alice", 100, "shared"),
      tx("Bob", -20, "shared"),
    ];
    const result = calcSettlement(txns, { A: 50, B: 50 }, "Alice", "Bob");
    // Bob's -$20 shared → aOwes += -10 (reduces Alice's obligation)
    expect(result.aOwes).toBeCloseTo(-10);
    expect(result.bOwes).toBeCloseTo(50);
    // net = aOwes - bOwes = -10 - 50 = -60 → Bob owes Alice $60
    expect(result.net).toBeCloseTo(-60);
    expect(result.settlement).toMatch(/Bob owes Alice/i);
  });

  it("refund that fully cancels an expense results in settled", () => {
    const txns = [
      tx("Alice", 100, "shared"),
      tx("Alice", -100, "shared"), // full refund
    ];
    const result = calcSettlement(txns, { A: 50, B: 50 }, "Alice", "Bob");
    expect(result.net).toBeCloseTo(0);
    expect(result.settlement).toMatch(/settled/i);
  });
});

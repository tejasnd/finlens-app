import { fmtD } from "../utils/formatters";

// Negative amounts (refunds/credits) are intentionally supported.
// Adding a negative reduces the payer's total and their counterpart's share obligation,
// which is the correct net-expense semantics for a refund on a shared or personal purchase.
export function calcSettlement(transactions, splitPct, nameA, nameB) {
  let aPaid = 0, bPaid = 0, aOwes = 0, bOwes = 0;

  transactions.forEach((t) => {
    if (t.splitType === "personal") {
      if (t.owner === nameA) aPaid += t.amount;
      else if (t.owner === nameB) bPaid += t.amount;
    } else {
      // shared — works correctly for negative amounts (refunds reduce both the
      // payer's net total and the other person's share obligation)
      const aShare = t.amount * (splitPct.A / 100);
      const bShare = t.amount * (splitPct.B / 100);
      if (t.owner === nameA) {
        aPaid += t.amount;
        bOwes += bShare;
      } else if (t.owner === nameB) {
        bPaid += t.amount;
        aOwes += aShare;
      }
    }
  });

  const net = aOwes - bOwes;
  return {
    aPaid, bPaid, aOwes, bOwes, net,
    settlement:
      net > 0.005 ? `${nameA} owes ${nameB} ${fmtD(net)}` :
      net < -0.005 ? `${nameB} owes ${nameA} ${fmtD(Math.abs(net))}` :
      "All settled up! 🎉",
  };
}

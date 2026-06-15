// Demo dataset for the hosted GitHub Pages demo (and a quick "see it populated"
// shortcut locally). Generates realistic couple transactions entirely in the
// browser — no upload, no backend — so a visitor can explore every
// frontend-only feature (Overview, Couple split, Monthly, Categories, Budgets,
// Subscriptions, Export) immediately. The AI tabs (Ask/Gmail) still require the
// local backend; see the README.

import { smartCategory } from "../utils/categorization";
import { SHARED_CATS } from "../constants";

export const SAMPLE_PERSONS = {
  A: { name: "Alex", color: "#FF6B9D" },
  B: { name: "Sam", color: "#7C8CF8" },
};

// [day-of-month, description, amount, owner]. Spread across three months so the
// Monthly tab and trends have something to show. Descriptions are real-looking
// merchant strings so smartCategory assigns sensible categories.
const ROWS = [
  // ── March ──
  ["2024-03-02", "TRADER JOES #455", 84.21, "Alex"],
  ["2024-03-03", "NETFLIX.COM", 15.99, "Alex"],
  ["2024-03-04", "SHELL OIL 574833", 48.7, "Sam"],
  ["2024-03-05", "STARBUCKS STORE #1187", 6.45, "Sam"],
  ["2024-03-07", "PG&E UTILITY PAYMENT", 142.3, "Alex"],
  ["2024-03-08", "CHIPOTLE ONLINE", 27.8, "Sam"],
  ["2024-03-10", "AMAZON.COM*MK12RT", 53.99, "Alex"],
  ["2024-03-12", "SPOTIFY USA", 11.99, "Sam"],
  ["2024-03-14", "WHOLE FOODS MARKET", 96.14, "Alex"],
  ["2024-03-15", "UBER TRIP HELP.UBER", 21.4, "Sam"],
  ["2024-03-17", "AT&T WIRELESS", 90.0, "Alex"],
  ["2024-03-19", "CVS/PHARMACY #download", 18.6, "Sam"],
  ["2024-03-22", "DELTA AIR LINES", 312.0, "Alex"],
  ["2024-03-24", "PLANET FITNESS", 24.99, "Sam"],
  ["2024-03-27", "HOME DEPOT #6213", 64.5, "Alex"],
  ["2024-03-29", "OLIVE GARDEN", 58.2, "Sam"],
  // ── April ──
  ["2024-04-01", "RENT - GREYSTONE APTS", 2100.0, "Alex"],
  ["2024-04-02", "NETFLIX.COM", 15.99, "Alex"],
  ["2024-04-03", "SAFEWAY #1422", 71.33, "Sam"],
  ["2024-04-05", "SHELL OIL 574833", 51.2, "Sam"],
  ["2024-04-06", "STARBUCKS STORE #1187", 5.75, "Alex"],
  ["2024-04-08", "PG&E UTILITY PAYMENT", 138.9, "Alex"],
  ["2024-04-09", "DOORDASH*PANERA", 34.6, "Sam"],
  ["2024-04-11", "AMAZON.COM*RT91PL", 29.49, "Alex"],
  ["2024-04-12", "SPOTIFY USA", 11.99, "Sam"],
  ["2024-04-15", "COSTCO WHOLESALE", 187.42, "Alex"],
  ["2024-04-16", "LYFT *RIDE WED", 16.8, "Sam"],
  ["2024-04-18", "AT&T WIRELESS", 90.0, "Alex"],
  ["2024-04-20", "TARGET T-2284", 62.18, "Sam"],
  ["2024-04-23", "SOUTHWEST AIRLINES", 198.0, "Alex"],
  ["2024-04-25", "PLANET FITNESS", 24.99, "Sam"],
  ["2024-04-28", "CHEVRON 0099221", 44.3, "Alex"],
  // ── May ──
  ["2024-05-01", "RENT - GREYSTONE APTS", 2100.0, "Alex"],
  ["2024-05-02", "NETFLIX.COM", 15.99, "Alex"],
  ["2024-05-03", "TRADER JOES #455", 78.9, "Sam"],
  ["2024-05-05", "SHELL OIL 574833", 49.6, "Sam"],
  ["2024-05-06", "PEETS COFFEE", 7.2, "Alex"],
  ["2024-05-08", "PG&E UTILITY PAYMENT", 151.05, "Alex"],
  ["2024-05-10", "CHIPOTLE ONLINE", 24.1, "Sam"],
  ["2024-05-11", "AMAZON.COM*99KLMN", 41.99, "Alex"],
  ["2024-05-12", "SPOTIFY USA", 11.99, "Sam"],
  ["2024-05-14", "WHOLE FOODS MARKET", 103.77, "Alex"],
  ["2024-05-16", "UBER TRIP HELP.UBER", 19.3, "Sam"],
  ["2024-05-18", "AT&T WIRELESS", 90.0, "Alex"],
  ["2024-05-20", "WALGREENS #4471", 22.45, "Sam"],
  ["2024-05-22", "AMC THEATRES", 38.5, "Alex"],
  ["2024-05-24", "PLANET FITNESS", 24.99, "Sam"],
  ["2024-05-26", "IKEA EMERYVILLE", 129.0, "Alex"],
  ["2024-05-29", "THAI BASIL RESTAURANT", 52.4, "Sam"],
];

export function makeSampleTransactions() {
  return ROWS.map(([date, description, amount, owner], i) => {
    const category = smartCategory(description);
    return {
      id: `sample-${i}`,
      source: "Sample data",
      owner,
      date: new Date(date),
      amount,
      description,
      category,
      splitType: SHARED_CATS.includes(category) ? "shared" : "personal",
    };
  });
}

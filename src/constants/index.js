export const CATEGORIES = [
  "Food & Dining", "Groceries", "Shopping", "Travel", "Transport",
  "Entertainment", "Health & Medical", "Utilities", "Subscriptions",
  "Education", "Personal Care", "Home & Living", "Finance & Fees",
  "Insurance", "Gifts & Donations", "Other",
];

export const SHARED_CATS = ["Home & Living", "Utilities", "Groceries", "Travel", "Entertainment"];

// All colors are verified WCAG AA (≥4.5:1) as text on their badge background
// (color @ 13% opacity over --card #0F2035). Failing originals are noted.
export const CAT_COLORS = {
  "Food & Dining":    "#FF6B6B", // 4.99 on badge bg ✅
  "Groceries":        "#FF9F43", // 6.37 ✅
  "Shopping":         "#FFC312", // 7.73 ✅
  "Travel":           "#06C5D8", // 6.06 ✅
  "Transport":        "#54A0FF", // 4.92 ✅
  "Entertainment":    "#A29BFE", // 5.38 ✅
  "Health & Medical": "#00B894", // 5.22 ✅
  "Utilities":        "#FDCB6E", // 8.04 ✅
  "Subscriptions":    "#E8856E", // 5.17 ✅  (was #E17055 → 4.41 ❌)
  "Education":        "#74B9FF", // 6.11 ✅
  "Personal Care":    "#FD79A8", // 5.42 ✅
  "Home & Living":    "#55EFC4", // 8.17 ✅
  "Finance & Fees":   "#8E9DA3", // 4.74 ✅  (was #636E72 → 2.78 ❌)
  "Insurance":        "#B2BEC3", // 6.57 ✅
  "Gifts & Donations":"#F36AB2", // 4.91 ✅  (was #E84393 → 3.90 ❌)
  "Other":            "#8AA0B5", // 4.90 ✅  (was #778CA3 → 3.97 ❌)
};

export const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** How many transactions to show per page in the Transactions tab. */
export const TX_PER_PAGE = 100;

/** Number of transactions sent to the AI provider in a single categorization request. */
export const AI_BATCH_SIZE = 50;

/** How many top merchants to surface in the Overview tab spending breakdown. */
export const TOP_MERCHANTS_COUNT = 10;

/** Max characters used as the normalized merchant key for subscription detection. */
export const MERCHANT_KEY_LENGTH = 36;

/** Max characters shown as the human-readable merchant name in subscription rows. */
export const MERCHANT_NAME_LENGTH = 40;

/** How many days a cached AI category result remains valid before re-categorizing. */
export const CATEGORY_CACHE_TTL_DAYS = 30;

/** Maximum number of entries kept in the category cache before evicting oldest. */
export const CATEGORY_CACHE_MAX_ENTRIES = 500;

export const TABS = ["Overview","Ask","Couple","Monthly","Categories","Budget","Subscriptions","Planning","Transactions"];

export const DEFAULT_PLAN = {
  personAIncome: 0, personBIncome: 0,
  personA401k: 0,   personB401k: 0,
  rothGoal: 7000, hsaGoal: 4300, savingsGoal: 20000,
  investments: { k401k: 0, t401k: 0, rothIRA: 0, hsa: 0, brokerage: 0, hysa: 0, overseas: 0 },
};

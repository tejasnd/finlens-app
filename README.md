# FinLens

[![CI](https://github.com/tejasnd/finlens-app/actions/workflows/ci.yml/badge.svg)](https://github.com/tejasnd/finlens-app/actions/workflows/ci.yml)

FinLens is a privacy-first personal finance tracker that runs entirely in your browser. Import bank transactions via CSV, get AI-powered categorization using your own API keys, track budgets and subscriptions, and visualize spending trends — all without your financial data ever leaving your device. Designed for individuals and couples who want full control over their money data without relying on third-party data aggregators or cloud storage.

---

## Features

- **CSV Upload** — Import transactions from any bank that exports CSV files
- **AI Categorization** — Automatically categorize transactions using your own OpenAI or Anthropic API key
- **Multi-Bank Support** — Aggregate transactions across multiple accounts and institutions
- **Couple / Split Tracking** — Assign transactions to individuals or split them between partners
- **Budget Tracking** — Set monthly budgets per category and track progress in real time
- **Subscription Detection** — Identify and monitor recurring charges
- **Excel Export** — Export your data and reports to `.xlsx` for offline use
- **GitHub Sync** — Back up and sync your data to a private GitHub repository

---

## Privacy

**Your financial data never leaves your device.**

All transaction data, budgets, and settings are stored exclusively in your browser's `localStorage`. No data is sent to any external server by the application itself.

The only exception is the optional AI categorization feature: if you choose to use it, your transaction descriptions are sent directly to the AI provider (OpenAI or Anthropic) using **your own API key**. FinLens never sees or proxies these requests — they go straight from your browser to the provider's API.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 19 |
| Build Tool | Vite |
| Charts | Recharts |
| Testing | Vitest |
| Styling | CSS Modules / custom CSS |
| Storage | Browser localStorage |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/tejasnd/finlens-app.git
cd finlens-app

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Deployment

FinLens is configured to deploy to GitHub Pages via the `gh-pages` package.

```bash
npm run deploy
```

This builds the app for production and pushes the output to the `gh-pages` branch of your repository. Make sure the `homepage` field in `package.json` matches your GitHub Pages URL.

---

## Screenshots

> Add screenshots here to help new users understand the interface.

| Screen | Description |
|---|---|
| `docs/screenshots/dashboard.png` | Main dashboard with spending overview |
| `docs/screenshots/transactions.png` | Transaction list with categories |
| `docs/screenshots/budgets.png` | Budget tracking by category |
| `docs/screenshots/subscriptions.png` | Detected recurring subscriptions |

To add screenshots: create a `docs/screenshots/` directory, add your images, and update the paths above.

---

## Known Limitations

- **API keys in localStorage** — If you use AI categorization, your API key is stored in `localStorage`. This is convenient but not hardened against XSS attacks on a shared or compromised machine. Do not use FinLens on untrusted devices with sensitive API keys.
- **No mobile optimization** — The UI is designed for desktop browsers. Mobile layouts are not yet supported and may render incorrectly on small screens.
- **localStorage limits** — Browsers typically cap `localStorage` at 5–10 MB. Very large transaction histories may hit this limit; use the GitHub Sync feature to work around it.
- **CSV format variance** — CSV parsers are tuned for common bank export formats. Unusual column names or date formats may require manual adjustment.

---

## Performance

The Transactions tab paginates at 100 rows per page (`TX_PER_PAGE` in `src/constants/index.js`), so the rendered DOM stays bounded regardless of dataset size. Virtual scrolling was evaluated and intentionally **not** implemented — the constant render cost of one page is well under the 16.7 ms frame budget.

Measurements on a synthetic dataset (averaged across 5 runs for derived data, 10 re-renders for React, jsdom for the latter — a real browser is 2–5× faster):

| Dataset size | Derived data recompute¹ | React table render² |
|---|---|---|
| 500 transactions  | 0.7 ms | 1.6 ms |
| 1,000 transactions | 1.4 ms | 1.6 ms |
| 2,000 transactions | 3.0 ms | 1.6 ms |
| 5,000 transactions | 8.0 ms | 1.6 ms |

¹ Sum of `filtered` + `spendOnly` + `catTotals` + `monthlyData` + `topMerchants` memos. Recomputed when filters or transactions change.
² Render time for the 100-row page slice. Constant because pagination caps the rendered rows; only the underlying dataset grows.

Search input is debounced 150 ms (`useDebounce`) so typing doesn't refilter on every keystroke. Tab components are wrapped in `React.memo` so they don't re-render when unrelated state (e.g. toasts) changes in `AppShell`.

If you regularly work with **10,000+ transactions** and notice the Transactions tab feels slow, consider implementing virtualization (e.g. `react-window`) and reducing `TX_PER_PAGE`.

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

## License

MIT

# FinLens — GitHub Setup & Data Sync Guide

## 1. Save Your App Code to GitHub

### First-time setup
```bash
cd finlens-app
git init
git add .
git commit -m "Initial FinLens app"

# Create a NEW repo on github.com (e.g. "finlens-app"), then:
git remote add origin https://github.com/YOUR_USERNAME/finlens-app.git
git branch -M main
git push -u origin main
```

---

## 2. Auto-Sync Expense Data (from inside the app)

### Create a private data repo
1. Go to github.com → New repository → name it `finlens-data` → set **Private**

### Generate a Personal Access Token
1. GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (classic)
2. Generate new token, check ✅ **repo** scope, copy it

### Connect in the app
1. Click 🐙 GitHub in the top bar
2. Paste token + enter `yourname/finlens-data`
3. Click 💾 Save → then ☁️ Sync to push data

Your data saves as `finlens-data.json` — transactions, budgets, split %, rules, investments all included.

---

## 3. Deploy the App (Optional)

### GitHub Pages
```bash
npm run build
npm install --save-dev gh-pages
# Add "deploy": "gh-pages -d dist" to package.json scripts
npm run deploy
# Live at: https://YOUR_USERNAME.github.io/finlens-app
```

### Netlify Drop (easiest)
1. `npm run build`
2. Drag the `dist/` folder to netlify.com/drop
3. Done — instant URL

---

## 4. Share with Another Person (Couple / Household Mode)

- App code: GitHub → Settings → Collaborators → invite them
- Data: share the same `finlens-data` private repo + token
  - One person syncs → the other loads — that's it

| Repo | Purpose |
|------|---------|
| `finlens-app` | App source code |
| `finlens-data` | Private expense data (JSON) |

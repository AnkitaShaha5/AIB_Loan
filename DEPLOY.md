# Deploy AIB Loan Tracker to GitHub Pages

Follow these steps after creating your personal GitHub repo.

## Step 1 – Create repo on GitHub

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `aib-loan-tracker` (or any name you like)
3. Choose **Private** (recommended – keeps your loan details in a private repo)
4. Do **not** add README, .gitignore, or license (this folder already has them)
5. Click **Create repository**

## Step 2 – Push this folder to GitHub

Open PowerShell in this folder (`aib-loan-tracker`) and run:

```powershell
cd "c:\Users\NH128480\Cursor_projects\entdata-data-fabric\dash_rental\dash_rental_silver_to_gold_load\src\aib-loan-tracker"

git init
git add .
git commit -m "Initial commit: AIB loan tracker PWA for iPhone"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/aib-loan-tracker.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

## Step 3 – Enable GitHub Pages

1. Open your repo on GitHub
2. Go to **Settings** → **Pages**
3. Under **Build and deployment**:
   - Source: **GitHub Actions**
4. Push to `main` again (or re-run the workflow) – the included workflow deploys automatically

After 1–2 minutes, your app will be live at:

```
https://YOUR_USERNAME.github.io/aib-loan-tracker/
```

## Step 4 – Install on iPhone

1. Open the URL above in **Safari**
2. Tap **Share** → **Add to Home Screen** → **Add**

---

## Using GitHub CLI (optional, faster)

If you have `gh` installed and logged in:

```powershell
cd "c:\Users\NH128480\Cursor_projects\entdata-data-fabric\dash_rental\dash_rental_silver_to_gold_load\src\aib-loan-tracker"

git init
git add .
git commit -m "Initial commit: AIB loan tracker PWA for iPhone"
git branch -M main
gh repo create aib-loan-tracker --private --source=. --push
```

Then enable Pages: **Settings → Pages → Source: GitHub Actions**

---

## Privacy note

- The repo contains default loan parameters (amount, rate, EMI)
- Payment history is stored **only on your phone** (localStorage), not on GitHub
- Use a **private** repo if you prefer

## Update the app later

```powershell
git add .
git commit -m "Update loan tracker"
git push
```

GitHub Pages redeploys automatically within ~1 minute.

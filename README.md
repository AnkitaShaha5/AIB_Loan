# AIB Loan Tracker (iPhone App)

A mobile-friendly app to track your AIB mortgage EMIs on your iPhone.

## Install on iPhone (no App Store needed)

### Option A – From your computer (same Wi‑Fi)

1. On your PC, open a terminal in this folder and run:
   ```
   python -m http.server 8080
   ```
2. Find your PC's local IP (e.g. `192.168.1.x`).
3. On iPhone Safari, go to: `http://YOUR-PC-IP:8080`
4. Tap **Share** → **Add to Home Screen** → **Add**

### Option B – Host online (works anywhere)

Upload the `aib-loan-tracker` folder to any web host (GitHub Pages, Netlify, iCloud Drive public link, etc.) and open the URL in Safari.

### Option C – Open file locally

Copy the `aib-loan-tracker` folder to iCloud Drive or Files app, open `index.html` in Safari (limited offline support).

## Features

- **Dashboard** – current balance, daily interest, next EMI
- **EMI Schedule** – tap any month to record a payment
- **Offline** – data saved on your phone (localStorage)
- **Pre-loaded** with your AIB loan details:
  - EUR 463,500 @ 3.20%
  - EMI EUR 1,858.36
  - Confirmed balance EUR 463,029.92 after Jul-2026 EMI

## Your loan data included

| Item | Value |
|------|-------|
| Start | 09-Nov-2025 |
| First EMI | 09-May-2026 |
| Jul-2026 closing | EUR 463,029.92 |
| Account | 937738 / 33549181 |

## Note on native App Store app

Apple requires a Mac + Xcode + Developer account (EUR 99/year) to publish a native iOS app. This PWA works like an app on your home screen without that process.

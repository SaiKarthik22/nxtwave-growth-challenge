# BuildAI·60: a growth engine for 500 registrations

> **NxtWave Growth Intern Challenge: Round 1 submission**
> Workshop: *"Build Your First AI Project in 60 Minutes"* · Goal: **500 final-year engineers** · Budget: **₹2,000** · Duration: **7 days**

**🔗 Live link:** `https://<your-github-username>.github.io/nxtwave-growth-challenge/` *(see [docs/DEPLOY.md](docs/DEPLOY.md))*

---

## What this is

Everyone builds a landing page. This project builds the **system** behind one.

The plan has two big channels: Campus Champions posting in WhatsApp class groups, and a referral loop. Together they should drive about 74% of registrations, but only if every share is tracked, credited and rewarded. So the asset is a referral-powered growth engine:

| Page | Who it's for | What it does |
|------|-------------|--------------|
| `index.html` (**Landing**) | Students | A/B-tested hero, live code-typing demo, countdown, live counter, 6-field registration with attribution |
| ↳ after registering | Students | Personal referral link, one-tap WhatsApp share in English / Telugu / Hinglish, reward tiers, calendar invite |
| `referral.html` (**Referral Hub**) | Students + Champions | Referral stats, leaderboards, College Battle, **Campus Champion kit** (tracking link, QR poster, 3-wave WhatsApp scripts) |
| `dashboard.html` (**Command Center**) | Growth team / reviewers | KPIs vs goal, daily pace, channel performance vs plan, funnel, A/B test, auto insights, day-by-day replay, CSV |
| `plan.html` (**Growth Plan**) | Reviewers | The 5-slide plan (prints to a 5-page PDF) |
| `notes.html` (**How I Thought**) | Reviewers | The 3 questions + AI & learning notes + AI suggestions I rejected |

**Demo mode** (on by default) blends a seeded, clearly labeled 7-day campaign simulation with your real test registrations, so the dashboards look alive. Switch it off in `js/config.js`.

## Run it on any computer

No installs and no build step are needed. Pick any one option:

1. **Double-click `index.html`**. It works straight from the file system.
2. **Windows:** double-click `start.bat`. **Mac/Linux:** `sh start.sh`.
3. **Terminal:** `npm start`, then open http://localhost:3000. It uses Node's built-in modules only, so there's no `npm install`.

```bash
git clone https://github.com/<your-username>/nxtwave-growth-challenge.git
cd nxtwave-growth-challenge
npm start
```

Health check: `npm run check` syntax-checks all JS and verifies every file the HTML references exists.

## Deploy (free live link)

- **GitHub Pages:** push to GitHub, then Settings → Pages → Deploy from branch `main` / root.
- **Netlify Drop:** drag the project folder onto https://app.netlify.com/drop.

The full steps are in [docs/DEPLOY.md](docs/DEPLOY.md).

## Optional: real shared data (free)

By default, data lives in each visitor's browser (localStorage). To collect real registrations from everyone into a Google Sheet, with live cross-device leaderboards, deploy [`backend/google-apps-script.gs`](backend/google-apps-script.gs) and paste its URL into `js/config.js`. It takes about 5 minutes; see [docs/BACKEND_SETUP.md](docs/BACKEND_SETUP.md).

## Project structure

```
├── index.html            Landing + registration
├── referral.html         Referral Hub + Campus Champion kit
├── dashboard.html        Growth Command Center
├── plan.html             5-slide growth plan
├── notes.html            How I Thought + AI notes
├── css/                  base · components · animations · landing · hub · dashboard · deck
├── js/
│   ├── config.js         ← all campaign settings live here
│   ├── store.js          attribution, A/B, events, storage (local or Google Sheets)
│   ├── seed.js           deterministic 7-day campaign simulation
│   ├── ui.js             shared nav/footer, reveal, toasts, effects
│   ├── background.js     neural-network canvas background
│   ├── landing.js · register.js · share.js · referral.js
│   ├── charts.js         dependency-free animated SVG charts
│   └── dashboard.js · deck.js
├── backend/google-apps-script.gs
├── docs/                 PROMPT · DEPLOY · BACKEND_SETUP · VIDEO_SCRIPT
├── server.js · start.bat · start.sh · package.json
└── PROGRESS.md           module-by-module build checklist
```

## Tech

Vanilla HTML, CSS and JavaScript, with zero dependencies. The only optional CDN script is `qrcode.js`, for the champion poster QR. It also uses Google Fonts, Google Sheets + Apps Script (optional backend) and GitHub Pages. **Total cost: ₹0.**

---
<sub>Concept prototype built for the NxtWave Growth Intern challenge. Not an official NxtWave page. Demo-mode numbers are simulated.</sub>

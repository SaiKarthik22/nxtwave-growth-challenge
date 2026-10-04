# BuildAI·60: Referral Engine & Growth Tracker

> **NxtWave Growth Intern Challenge: Working Asset ("Build One Thing")**
> Supports the campaign to get **500 final-year engineers** into the free workshop *"Build Your First AI Project in 60 Minutes"* on a **₹2,000** budget in **7 days**.

**🔗 Live link:** https://saikarthik22.github.io/nxtwave-growth-challenge/  ·  **Code:** https://github.com/SaiKarthik22/nxtwave-growth-challenge

---

## What it is

The brief lists options like a landing page, WhatsApp flow, referral code and tracker, or engagement tools, and it warns that everyone will build a landing page. This asset goes further. It's a **referral code + tracker system**, with the landing page as its front door.

The campaign relies on students bringing students: Campus Champions posting in WhatsApp class groups, plus a referral loop. That only works if every share is **tracked, credited and rewarded**, so that's what this builds.

| Page | Who uses it | What it does |
|------|-------------|--------------|
| `index.html` (**Workshop**) | Students | A/B-tested hero, live code-typing demo, countdown, live counter, 6-field registration with UTM + referral attribution |
| ↳ after registering | Students | Personal referral code + link, one-tap WhatsApp share in English / Telugu / Hinglish, reward tiers (1 / 3 / 5 friends), Google Calendar + .ics invite, confetti |
| `referral.html` (**Referral Hub**) | Students + Campus Champions | Referral stats by code, leaderboards (top referrers, champions, College Battle), **Campus Champion kit**: tracking link, downloadable QR poster, 3-wave WhatsApp scripts in English + Telugu |
| `dashboard.html` (**Command Center**) | Growth team | Registrations vs goal, daily pace, channel performance vs targets, funnel drop-offs, A/B test with significance, auto "what to do next" insights, day-by-day replay, CSV export |

**Demo mode** (on by default) blends a seeded, clearly labeled 7-day campaign simulation with your real test registrations, so the tracker has data to show. Turn it off in `js/config.js` (`demoMode: false`).

## Try the full flow (2 minutes)

1. Open **Workshop** and register. You get a seat number and your personal referral link.
2. Open your referral link **in the same browser**. You'll see "invited by …" just as your friend would. Click **Register another student on this device** and register a "friend" with a different phone and email.
3. Open **Referral Hub** and enter your code. The friend is credited, and your reward progress moves.
4. Fill in **Become a Campus Champion** to get a tracking link, a QR poster (PNG download) and ready-made WhatsApp messages.
5. Open **Command Center** and press ▶ to replay the 7-day campaign. Your real test registrations appear as live data.

By default each browser keeps its own data, so test in one browser. To credit friends across phones and laptops, connect the free Google Sheets backend (below).

## Run it on any computer

No installs and no build step are needed. Pick any one option:

1. **Double-click `index.html`**. It works straight from the file system.
2. **Windows:** double-click `start.bat`. **Mac/Linux:** `sh start.sh`.
3. **Terminal:** `npm start`, then open http://localhost:3000. It uses Node's built-in modules only, so there's no `npm install`.

```bash
git clone https://github.com/SaiKarthik22/nxtwave-growth-challenge.git
cd nxtwave-growth-challenge
npm start
```

Health check: `npm run check` syntax-checks all JS and verifies every file the HTML references exists.

## Deploy (free live link)

- **GitHub Pages:** push to GitHub, then Settings → Pages → Deploy from branch `main` / root.
- **Netlify Drop:** drag the project folder onto https://app.netlify.com/drop.

The full steps are in [docs/DEPLOY.md](docs/DEPLOY.md).

## Optional: real shared data (free)

By default, data lives in each visitor's browser (localStorage). To collect real registrations from everyone into one Google Sheet, with leaderboards and the Command Center updating across devices, deploy [`backend/google-apps-script.gs`](backend/google-apps-script.gs) and paste its URL into `js/config.js`. It takes about 5 minutes; see [docs/BACKEND_SETUP.md](docs/BACKEND_SETUP.md).

## Project structure

```
├── index.html            Workshop landing + registration
├── referral.html         Referral Hub + Campus Champion kit
├── dashboard.html        Growth Command Center (tracker)
├── css/                  base · components · animations · landing · hub · dashboard
├── js/
│   ├── config.js         ← all campaign settings (goal, dates, rewards, channel targets, backend URL)
│   ├── store.js          attribution, A/B variant, events, storage (local or Google Sheets)
│   ├── seed.js           deterministic 7-day campaign simulation (demo mode)
│   ├── ui.js             shared nav/footer, reveal, toasts, effects
│   ├── background.js     aurora canvas background (drifting colour blobs)
│   ├── landing.js · register.js · share.js · referral.js
│   ├── charts.js         dependency-free animated SVG charts
│   └── dashboard.js
├── backend/google-apps-script.gs   optional free backend
├── docs/                 PROMPT · DEPLOY · BACKEND_SETUP
├── scripts/check.js      health check
├── server.js · start.bat · start.sh · package.json
└── PROGRESS.md           module-by-module build checklist
```

## Tech

Vanilla HTML, CSS and JavaScript, with zero dependencies. The only optional CDN script is `qrcode.js`, for the champion poster QR. It also uses Google Fonts, Google Sheets + Apps Script (optional backend) and GitHub Pages. **Total cost: ₹0.**

---
<sub>Concept prototype built for the NxtWave Growth Intern challenge. Not an official NxtWave page. Demo-mode numbers are simulated.</sub>

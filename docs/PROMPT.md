# The Prompts Used to Build This Project

This project was built with Claude, one module at a time. You can reuse these prompts to rebuild, extend or remix it on any computer: use Claude Code, claude.ai, Cursor or any AI coding tool.

**How to use:** paste the **Master Prompt** first. Then paste the **module prompts** one at a time. After each module, open the site, check it, and commit (`git commit -m "Module N: ..."`). Then move to the next one.

---

## Master Prompt (paste this first)

```text
You are a senior growth engineer and award-winning product designer. Help me win the
NxtWave Growth Intern challenge.

THE CHALLENGE
NxtWave is launching a FREE online workshop: "Build Your First AI Project in 60 Minutes".
Goal: get 500 final-year engineering students to register.
Constraints: Rs 2,000 budget, 7-day campaign, any AI tools. It's a simulation.
This prompt builds ONLY task 3, "Build One Thing": one working asset with a live link
that supports my plan. (The growth plan slides, AI notes and video are separate
submissions, so do NOT build them here.) They warned "everyone will build a landing
page", and the more complex and effective the asset, the better.

MY STRATEGY (build around this)
- Target: final-year B.Tech students (2027 batch) at Tier-2/3 colleges in AP & Telangana,
  who are in placement season with no live project on their resume.
- Main channels: (1) Campus Champions (class reps/club leads) posting in WhatsApp class
  groups with personal tracking links, (2) a referral loop with reward tiers,
  (3) placement cells and coding clubs, (4) Instagram + LinkedIn with a Rs 600 boost.
- Budget: Rs 1,000 champion rewards, Rs 600 Instagram boost, Rs 400 referral prizes, Rs 0 tools.

THE ASSET: "BuildAI·60", a referral code + tracker system (the landing page is just its front door)
1. Landing page: A/B-tested headline, live code-typing demo, countdown, live seat counter,
   projects, 60-min agenda, FAQ, smart 6-field registration form.
2. Referral engine: UTM + ?ref= attribution, unique referral code per registrant,
   one-tap WhatsApp share in English/Telugu/Hinglish, reward tiers (1/3/5 referrals),
   Google Calendar + .ics invite, confetti.
3. Referral Hub: stats lookup by code, leaderboards (referrers, champions, college battle),
   and a Campus Champion kit generator: tracking link, QR poster (PNG), 3-wave WhatsApp scripts.
4. Growth Command Center dashboard: KPIs vs goal, daily registrations vs target pace,
   channel performance vs targets, funnel drop-offs, A/B test with significance, rule-based
   "what the data says -> what we do next" insights, day-by-day replay slider, CSV export.
5. Optional free backend: Google Sheets + Apps Script, falling back to localStorage.
   Demo mode blends a seeded 7-day simulation so the prototype feels alive (clearly labeled).

TECH RULES (non-negotiable)
- Pure HTML + CSS + vanilla JavaScript. No framework, no build step, no npm dependencies.
- Classic <script> tags (no ES modules), so it also works by double-clicking index.html.
- Must deploy as-is to GitHub Pages / Netlify / Vercel and run on any computer after git clone.
- Include a zero-dependency Node static server (server.js), start.bat and start.sh.
- Accessible: semantic HTML, keyboard focus, labels, prefers-reduced-motion support.
- Responsive down to 360px wide with no horizontal scroll.

DESIGN DIRECTION (must look premium and unique, not template-y)
- Dark "AI lab" aesthetic: near-black ink background, animated neural-network canvas
  (drifting nodes, connecting lines, signal pulses travelling along edges, mouse
  interaction), soft aurora gradient blobs, a faint grid and film grain.
- Palette: electric violet #7c6bff, cyan #2fe3f0, lime #c3f75c, amber for urgency.
- Fonts: Bricolage Grotesque (display), Manrope (body), JetBrains Mono (code/labels).
- Glassmorphism cards with gradient borders, mouse-follow spotlight, magnetic buttons
  with shine sweep, scroll-reveal with stagger, count-up numbers, animated SVG charts.

WORK STYLE
- Build in the modules I give you, one at a time. Finish each module completely,
  tell me what to check, then wait for "next".
- Keep a PROGRESS.md checklist and update it at the end of every module.
- Put all campaign settings (goal, dates, rewards, backend URL) in js/config.js.
```

---

## Module Prompts (paste one at a time)

**Module 0: Scaffold**
```text
Module 0: create the folder structure (css/, js/, backend/, docs/, scripts/), README.md,
PROGRESS.md (module checklist), .gitignore, .nojekyll, package.json with "npm start",
a zero-dependency server.js, start.bat, start.sh, and scripts/check.js. The check script
should syntax-check all JS and verify that every local file the HTML references exists.
```

**Module 1: Design system and animated background**
```text
Module 1: build css/base.css (design tokens, reset, typography, background layers),
css/components.css (sticky glass nav with mobile drawer, buttons, cards with gradient
border and spotlight, form fields, chips, tabs, accordion, toast, tables, code window,
footer) and css/animations.css (keyframes, data-reveal scroll animations with stagger,
reduced-motion overrides). Build js/background.js: a performant neural-network canvas
with signal pulses and mouse interaction that pauses when the tab is hidden. Build js/ui.js:
inject the shared nav and footer; reveal observer, count-up, toast,
copy-to-clipboard, spotlight and magnetic effects, and number/date formatters.
```

**Module 2: Data layer and simulation**
```text
Module 2: js/config.js (all campaign settings, plus an "auto" workshop date: next Sunday
6 PM IST), js/store.js (first/last-touch attribution from utm_* and ?ref=, A/B variant
assignment, event tracking, registrations and champions in localStorage with an optional
Google Apps Script remote adapter, dedupe by phone/email, referral code generation, and
merged demo+live datasets) and js/seed.js (a deterministic, seeded 7-day campaign
simulation: ~571 registrations across 5 channels, 40 champions, realistic colleges in
AP/TS, A/B split, visits/form-start/share events, consistent with the channel targets).
```

**Module 3: Landing page**
```text
Module 3: index.html + css/landing.css + js/landing.js. Hero with A/B headline variants,
a live code window that types 3 real Python + Gradio mini-projects in a loop with syntax
highlighting and a "deployed" output, a countdown, a live registered counter with progress
to 500, and an avatar stack. Then a hiring-companies marquee, "why now" cards, 3 projects
with tilt cards, a 60-minute agenda timeline, who it is / isn't for, rewards, a college
battle preview, an FAQ accordion, a final CTA, live "X just registered" toasts and a
mobile sticky CTA.
```

**Module 4: Registration and referral engine**
```text
Module 4: js/register.js + js/share.js. 6-field form (name, WhatsApp, email, college with
autocomplete, branch, graduation year) with inline validation and form_start tracking.
On success: a confetti burst, seat number, personal referral link and code, share buttons
(WhatsApp EN/Telugu/Hinglish, LinkedIn, native share, copy), reward progress, Google
Calendar link + .ics download, and a link to the Referral Hub.
```

**Module 5: Referral Hub and Campus Champion kit**
```text
Module 5: referral.html + css/hub.css + js/referral.js. Look up stats by code (auto-load
your own code): referrals, rank, tier progress, the people you referred. Tabbed
leaderboards: top referrers, champions, college battle. A Campus Champion kit generator:
a champion tracking link, a downloadable 1080x1350 QR poster drawn on canvas, and
3-wave WhatsApp scripts (Day 2 intro, Day 5 social proof, Day 7 last call) in
English + Telugu, each with copy / send-on-WhatsApp buttons.
```

**Module 6: Growth Command Center**
```text
Module 6: dashboard.html + css/dashboard.css + js/charts.js (dependency-free animated SVG
charts: bar + cumulative line + target pace, horizontal bars, donut, funnel, progress ring,
with tooltips) + js/dashboard.js. Include a Demo/Live toggle, a day 1-7 replay slider with
play button, 6 KPIs, a channel table vs targets, a funnel, an A/B test with a z-test,
top colleges/champions/referrers, rule-based insights with recommended actions, recent
registrations and CSV export.
```

**Module 7: Backend, deploy and polish**
```text
Module 7: backend/google-apps-script.gs (doPost register/champion/event with LockService
and dedupe, doGet stats with sanitized public data, formula-injection protection),
docs/BACKEND_SETUP.md, docs/DEPLOY.md (GitHub + GitHub Pages + Netlify Drop), and a
final QA pass: run npm run check, test mobile widths, and check console errors.
```

**Module 9: Aurora light redesign**
```text
Module 9: restyle the whole app into a bright "Aurora light" theme without changing any
behaviour: a paper background (#f6f5fb) with slowly drifting aurora colour blobs on a
canvas (indigo, coral, teal, rose, sky), deep indigo #3d3bd9 + coral #ff6b4a accents,
Sora (display) + Plus Jakarta Sans (body) + IBM Plex Mono (code), white rounded cards with
soft shadows, a floating frosted nav pill, coral pill CTAs with a sheen sweep,
rise-and-unblur scroll reveals, a light code editor in the hero and a light QR poster.
Keep every id, data attribute, feature name, reward and number; refresh about 15% of the
secondary copy. Check contrast, 390px mobile and console errors.
```

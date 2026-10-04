/* =========================================================
   BuildAI·60 — Campaign configuration
   Everything a growth team would tweak lives here.
   ========================================================= */
window.CONFIG = {
  brand: "BuildAI·60",

  workshop: {
    title: "Build Your First AI Project in 60 Minutes",
    // "auto" = the next Sunday that is at least 2 days away, 6:00 PM IST.
    // That keeps the demo evergreen. For a real run, set a fixed date such as
    // "2026-10-11T18:00:00+05:30"
    date: "auto",
    hourIST: 18,
    durationMin: 60,
    platform: "Live on Zoom (link sent on WhatsApp + email)",
    languages: "English + Telugu",
  },

  goal: 500,             // registrations
  campaignDays: 7,
  budget: 2000,          // INR
  showUpRate: 0.4,       // expected attendance from registrations

  // Demo mode blends a seeded 7-day campaign simulation with real registrations
  // made on this device (or via the backend), so the prototype feels alive.
  // Everything simulated is labelled "Demo data".
  demoMode: true,
  demoDay: 5,            // which simulated campaign day the landing page and hub "are on"

  // Optional free backend: paste your Google Apps Script web-app URL here
  // (see docs/BACKEND_SETUP.md). Leave empty to store data in the browser only.
  backendUrl: "",

  // Optional: your GitHub repo URL. It shows a "Source code" link in the footer.
  repoUrl: "https://github.com/saikoushik22/nxtwave-growth-challenge",

  // Channel targets used by the Command Center's "vs plan" comparison (they add up to 570, a 14% buffer over 500).
  channels: {
    whatsapp:  { label: "Campus Champions · WhatsApp groups", short: "Champions · WhatsApp", color: "#3ee6a0", plan: 300, conv: 0.21 },
    referral:  { label: "Referral loop",                       short: "Referrals",            color: "#a99bff", plan: 120, conv: 0.31 },
    email:     { label: "Placement cells & coding clubs",      short: "Placement cells",      color: "#2fe3f0", plan: 60,  conv: 0.24 },
    instagram: { label: "Instagram (reel + ₹600 boost)",       short: "Instagram",            color: "#ff5d8f", plan: 60,  conv: 0.12 },
    linkedin:  { label: "LinkedIn",                            short: "LinkedIn",             color: "#ffb547", plan: 30,  conv: 0.19 },
    direct:    { label: "Direct / other",                      short: "Direct",               color: "#8b90ae", plan: 0,   conv: 0.15 },
  },

  rewards: [
    { at: 1, icon: "🧠", title: "AI Prompt Pack", desc: "50 battle-tested prompts for projects, resumes and interviews." },
    { at: 3, icon: "🚀", title: "Starter Repo + Early-Bird Certificate", desc: "A ready-to-deploy project template and an \"AI Builder · Early Access\" certificate." },
    { at: 5, icon: "🎯", title: "Live Project Review", desc: "Your project gets reviewed live on screen by the instructor." },
  ],
  topReferrerPrize: "Top 4 referrers win a ₹100 mobile recharge",
  championPrize: "Top 5 Campus Champions share a ₹1,000 Amazon voucher pool",

  colleges: [
    "KL University", "VR Siddhartha Engineering College", "GITAM University", "Vignan's University",
    "RVR & JC College of Engineering", "PVP Siddhartha Institute of Technology", "Gudlavalleru Engineering College",
    "Lakireddy Bali Reddy College of Engineering", "SRKR Engineering College", "GVP College of Engineering",
    "MVGR College of Engineering", "Aditya Engineering College", "JNTU Kakinada", "SVEC Tirupati",
    "CBIT Hyderabad", "Vasavi College of Engineering", "VNR VJIET", "CVR College of Engineering",
    "Sreenidhi Institute of Science & Technology", "MLR Institute of Technology", "Malla Reddy Engineering College",
    "Anurag University", "KITS Warangal", "JNTU Hyderabad", "Gokaraju Rangaraju Institute (GRIET)",
  ],
  branches: ["CSE", "CSE (AI & ML)", "CSE (Data Science)", "IT", "ECE", "EEE", "Mechanical", "Civil", "Other"],
};

/* ---------- date helpers (IST-safe, no libraries) ---------- */
(function (C) {
  var IST = 330 * 60000;
  var DAY = 86400000;

  // Workshop start as a Date
  C.workshopDate = function () {
    if (C.workshop.date && C.workshop.date !== "auto") return new Date(C.workshop.date);
    var now = Date.now();
    var ist = new Date(now + IST); // read with UTC getters = IST wall clock
    var daysToSun = (7 - ist.getUTCDay()) % 7;
    var target = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + daysToSun, C.workshop.hourIST, 0) - IST;
    while (target - now < 2 * DAY) target += 7 * DAY;
    return new Date(target);
  };

  // Campaign day 1 starts at 00:00 IST, 6 days before the workshop day (workshop = Day 7 evening)
  C.campaignStart = function () {
    var w = new Date(C.workshopDate().getTime() + IST);
    return new Date(Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate() - (C.campaignDays - 1)) - IST);
  };

  // Campaign day number (1..7) for a timestamp; values outside the window are clamped
  C.dayOf = function (ts) {
    var d = Math.floor((new Date(ts).getTime() - C.campaignStart().getTime()) / DAY) + 1;
    return Math.max(1, Math.min(C.campaignDays, d));
  };

  // Label like "Mon 5 Oct" for a campaign day
  C.dayLabel = function (day) {
    var d = new Date(C.campaignStart().getTime() + (day - 1) * DAY + 12 * 3600000);
    return d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" });
  };

  C.DAY_MS = DAY;
})(window.CONFIG);

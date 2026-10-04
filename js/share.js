/* =========================================================
   BuildAI·60 — Sharing toolkit
   Referral links, WhatsApp copy (EN / Telugu / Hinglish),
   Campus Champion 3-wave scripts, calendar invites.
   ========================================================= */
window.Share = (function () {
  "use strict";
  var C = window.CONFIG;

  /* Base URL of the landing page. Keeps "index.html" on file:// so the link still opens. */
  function base() {
    var href = window.location.href.split("#")[0].split("?")[0];
    var dir = href.replace(/[^/]*$/, "");
    return window.location.protocol === "file:" ? dir + "index.html" : dir;
  }

  function referralLink(code, opts) {
    opts = opts || {};
    var p = new URLSearchParams();
    p.set("ref", code);
    p.set("utm_source", opts.source || "referral");
    if (opts.medium) p.set("utm_medium", opts.medium);
    return base() + "?" + p.toString();
  }

  function championLink(code) {
    return referralLink(code, { source: "whatsapp", medium: "champion" });
  }

  function when() {
    var d = C.workshopDate();
    var day = UI.dateFmt(d, { weekday: "long" });
    var time = UI.dateFmt(d, { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
    return { day: day, time: time, dayTe: teluguDay(d) };
  }
  function teluguDay(d) {
    var days = ["ఆదివారం", "సోమవారం", "మంగళవారం", "బుధవారం", "గురువారం", "శుక్రవారం", "శనివారం"];
    var ist = new Date(d.getTime() + 330 * 60000);
    return days[ist.getUTCDay()];
  }

  /* Student → friends. Outcome first, link last, written the way a classmate talks. */
  function messages(link) {
    var w = when();
    return {
      en:
        "Hey! 👋 Free live workshop this " + w.day + " at " + w.time + ": *Build Your First AI Project in 60 Minutes* (NxtWave).\n" +
        "You leave with a live AI app + GitHub link for your resume. No AI experience needed.\n" +
        "I just registered. Grab your seat 👇\n" + link,
      te:
        "హాయ్ 👋 ఈ " + w.dayTe + " " + w.time + " కి ఫ్రీ లైవ్ వర్క్‌షాప్: *60 నిమిషాల్లో మీ మొదటి AI ప్రాజెక్ట్* (NxtWave).\n" +
        "చివర్లో మీ రెజ్యూమ్‌కి లైవ్ AI ప్రాజెక్ట్ లింక్ + GitHub రెడీ. AI ఎక్స్‌పీరియన్స్ అవసరం లేదు.\n" +
        "నేను రిజిస్టర్ అయ్యాను, మీరూ జాయిన్ అవ్వండి 👇\n" + link,
      hi:
        "Bhai 👋 Is " + w.day + " " + w.time + " free live workshop hai: *Build Your First AI Project in 60 Minutes* (NxtWave).\n" +
        "End mein resume ke liye live AI project + GitHub link milega. AI experience zaroori nahi.\n" +
        "Maine register kar liya, tu bhi kar 👇\n" + link,
    };
  }

  /* Campus Champion → class groups, in 3 waves timed to the campaign. */
  function championWaves(link, ctx) {
    var w = when();
    var college = ctx.college || "our college";
    var count = ctx.count ? UI.fmt(ctx.count) + "+" : "Hundreds of";
    var rank = ctx.rank ? "#" + ctx.rank : "in the top 10";
    return [
      {
        day: "Day 2 · Intro",
        tip: "Post in 3 class/department groups between 7 and 9 PM, when groups are most active.",
        en:
          "Guys 👋 NxtWave is running a FREE 60-min live workshop this " + w.day + " (" + w.time + ") where we actually build and deploy an AI project.\n" +
          "Useful for placements: you get a live project link for your resume + a certificate.\n" +
          "I'm the campus champion for " + college + ". Register here 👇\n" + link,
        te:
          "ఫ్రెండ్స్ 👋 ఈ " + w.dayTe + " " + w.time + " కి NxtWave ఫ్రీ 60 నిమిషాల లైవ్ వర్క్‌షాప్. మనమే AI ప్రాజెక్ట్ బిల్డ్ చేసి డిప్లాయ్ చేస్తాం.\n" +
          "ప్లేస్‌మెంట్స్‌కి యూజ్‌ఫుల్: రెజ్యూమ్‌కి లైవ్ ప్రాజెక్ట్ లింక్ + సర్టిఫికెట్.\n" +
          college + " క్యాంపస్ ఛాంపియన్‌గా షేర్ చేస్తున్నా. ఇక్కడ రిజిస్టర్ అవ్వండి 👇\n" + link,
      },
      {
        day: "Day 5 · Social proof",
        tip: "Screenshot the College Battle leaderboard and post it with this message.",
        en:
          "Update 🔥 " + count + " students have already registered and " + college + " is " + rank + " in the College Battle.\n" +
          "Let's take #1! If you haven't registered yet, it takes 30 seconds 👇\n" + link,
        te:
          "అప్‌డేట్ 🔥 ఇప్పటికే " + count + " మంది రిజిస్టర్ అయ్యారు. College Battle లో " + college + " " + rank + " లో ఉంది.\n" +
          "మనం #1 అవ్వాలి! ఇంకా రిజిస్టర్ అవ్వకపోతే 30 సెకన్లు చాలు 👇\n" + link,
      },
      {
        day: "Day 7 · Last call",
        tip: "Send at 10 AM and again 2 hours before the workshop. Pin it in the group.",
        en:
          "Last call ⏰ Registrations close today. 60 minutes, free, and you walk out with a live AI project.\n" +
          "Starts " + w.time + ". Register now 👇\n" + link,
        te:
          "లాస్ట్ కాల్ ⏰ ఈరోజే రిజిస్ట్రేషన్ క్లోజ్. 60 నిమిషాలు, ఫ్రీ, చివర్లో లైవ్ AI ప్రాజెక్ట్ మీదే.\n" +
          w.time + " కి స్టార్ట్. ఇప్పుడే రిజిస్టర్ అవ్వండి 👇\n" + link,
      },
    ];
  }

  function wa(text) { return "https://wa.me/?text=" + encodeURIComponent(text); }
  function linkedin(link) { return "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(link); }

  function native(text, link) {
    if (!navigator.share) return Promise.resolve(false);
    return navigator.share({ title: C.workshop.title, text: text, url: link }).then(function () { return true; }, function () { return false; });
  }

  /* ---------- calendar ---------- */
  function stamp(d) { return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); }

  function gcal(link) {
    var start = C.workshopDate();
    var end = new Date(start.getTime() + C.workshop.durationMin * 60000);
    var p = new URLSearchParams({
      action: "TEMPLATE",
      text: C.workshop.title + " · NxtWave (Free)",
      dates: stamp(start) + "/" + stamp(end),
      details: "Free live workshop. The joining link is sent on WhatsApp + email. Keep your laptop and Chrome ready.\n\nInvite friends with your link: " + (link || base()),
      location: "Online (Zoom)",
    });
    return "https://calendar.google.com/calendar/render?" + p.toString();
  }

  function icsEscape(s) { return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); }

  function downloadICS(link) {
    var start = C.workshopDate();
    var end = new Date(start.getTime() + C.workshop.durationMin * 60000);
    var lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//BuildAI60//Workshop//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:" + stamp(start) + "-" + Math.random().toString(36).slice(2) + "@buildai60",
      "DTSTAMP:" + stamp(new Date()),
      "DTSTART:" + stamp(start),
      "DTEND:" + stamp(end),
      "SUMMARY:" + icsEscape(C.workshop.title + " · NxtWave (Free)"),
      "DESCRIPTION:" + icsEscape("Free live workshop. The joining link is sent on WhatsApp + email.\nInvite friends: " + (link || base())),
      "LOCATION:Online (Zoom)",
      "BEGIN:VALARM", "TRIGGER:-PT60M", "ACTION:DISPLAY", "DESCRIPTION:Workshop starts in 1 hour", "END:VALARM",
      "END:VEVENT", "END:VCALENDAR",
    ];
    var blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "build-ai-project-workshop.ics";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  return {
    base: base,
    referralLink: referralLink,
    championLink: championLink,
    messages: messages,
    championWaves: championWaves,
    wa: wa,
    linkedin: linkedin,
    native: native,
    gcal: gcal,
    downloadICS: downloadICS,
  };
})();

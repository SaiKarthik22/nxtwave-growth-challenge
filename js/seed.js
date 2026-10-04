/* =========================================================
   BuildAI·60 — Deterministic 7-day campaign simulation
   ---------------------------------------------------------
   Generates the data the Command Center would see if the plan
   ran: ~571 registrations, 40 Campus Champions, per-channel visits,
   form starts and shares, plus an A/B headline split.
   It is seeded, so every visitor sees the same "campaign".
   Daily numbers follow the channel targets in config.js with
   realistic over/under-delivery per channel.
   ========================================================= */
window.Seed = (function () {
  "use strict";
  var C = window.CONFIG;
  var cache = null;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var FIRST = ["Sai", "Ravi", "Harsha", "Sneha", "Keerthi", "Vamsi", "Lakshmi", "Pranav", "Divya", "Charan",
    "Bhavana", "Tarun", "Anusha", "Rohith", "Swathi", "Manoj", "Pooja", "Karthik", "Navya", "Teja", "Sravani",
    "Akhil", "Mounika", "Venkat", "Harika", "Nikhil", "Sindhu", "Rahul", "Deepika", "Srikanth", "Likhitha",
    "Aditya", "Yamini", "Praveen", "Hema", "Gopi", "Tejaswini", "Abhinav", "Ramya", "Kiran", "Sahithi", "Varun",
    "Meghana", "Ajay", "Jahnavi", "Surya", "Bindu", "Arjun", "Niharika", "Dinesh", "Revathi", "Krishna", "Anjali",
    "Mahesh", "Pavani", "Siddharth", "Vaishnavi", "Naveen", "Chandana", "Rakesh", "Ayesha", "Imran", "Fathima",
    "John", "Priya", "Arun", "Kavya", "Sameer", "Zoya", "Vishal", "Koushik", "Sumanth", "Phani", "Lokesh", "Ishita"];
  var LAST = "ABCDGKMNPRSTVY";
  var COLLEGE_W = [9, 8, 8, 7, 6, 5, 5, 4, 5, 5, 4, 4, 3, 3, 6, 5, 5, 4, 4, 3, 3, 3, 2, 3, 3];
  var BRANCH_W = [["CSE", 34], ["CSE (AI & ML)", 14], ["CSE (Data Science)", 6], ["IT", 11], ["ECE", 19], ["EEE", 8], ["Mechanical", 4], ["Civil", 2], ["Other", 2]];
  var CH_ROLES = ["Class Representative", "Coding Club Lead", "GDG / IEEE Lead", "Placement Coordinator", "Student Volunteer"];
  // TPO / club emails went to these colleges (indexes into CONFIG.colleges)
  var TPO = [0, 1, 2, 3, 4, 9, 14, 15, 16, 17, 18, 24];

  // registrations per day per channel (sums: 38, 92, 96, 84, 88, 79, 94 = 571)
  var DAILY = [
    { whatsapp: 22, referral: 4,  email: 0,  instagram: 6,  linkedin: 6 },
    { whatsapp: 52, referral: 12, email: 18, instagram: 4,  linkedin: 6 },
    { whatsapp: 46, referral: 18, email: 16, instagram: 12, linkedin: 4 },
    { whatsapp: 40, referral: 20, email: 8,  instagram: 12, linkedin: 4 },
    { whatsapp: 42, referral: 24, email: 6,  instagram: 8,  linkedin: 8 },
    { whatsapp: 34, referral: 26, email: 4,  instagram: 10, linkedin: 5 },
    { whatsapp: 40, referral: 30, email: 6,  instagram: 12, linkedin: 6 },
  ];
  var MEDIUM = { whatsapp: "champion", referral: "link", email: "tpo", instagram: "story", linkedin: "post" };

  function generate() {
    var rnd = mulberry32(20261004);
    var pick = function (arr) { return arr[(rnd() * arr.length) | 0]; };
    var weighted = function (items, wfn) {
      var total = 0, i;
      for (i = 0; i < items.length; i++) total += wfn(items[i], i);
      var r = rnd() * total;
      for (i = 0; i < items.length; i++) { r -= wfn(items[i], i); if (r <= 0) return items[i]; }
      return items[items.length - 1];
    };
    var colleges = C.colleges;
    var collegeIdx = colleges.map(function (_, i) { return i; });
    var randomCollege = function () { return colleges[weighted(collegeIdx, function (i) { return COLLEGE_W[i] || 2; })]; };
    var name = function () { return pick(FIRST) + " " + LAST[(rnd() * LAST.length) | 0] + "."; };
    var taken = {};
    var ALPH = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
    var code = function (n) {
      var base = n.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
      if (base.length < 3) base = (base + "BLDR").slice(0, 4);
      var c;
      do {
        c = base + "-" + ALPH[(rnd() * ALPH.length) | 0] + ALPH[(rnd() * ALPH.length) | 0] + ALPH[(rnd() * ALPH.length) | 0];
      } while (taken[c]);
      taken[c] = 1;
      return c;
    };
    var start = C.campaignStart().getTime();
    var DAY = C.DAY_MS;
    var tsFor = function (day, hourMin, hourMax) {
      var h;
      var r = rnd();
      if (hourMin != null) h = hourMin + rnd() * (hourMax - hourMin);
      else if (r < 0.58) h = 19 + rnd() * 4.8;       // evening peak
      else if (r < 0.82) h = 12 + rnd() * 2.5;       // lunch break
      else h = 8 + rnd() * 15;
      return start + (day - 1) * DAY + Math.floor(h * 3600000);
    };

    /* ---- 40 Campus Champions, recruited on Day 1 ---- */
    var champions = [];
    for (var c = 0; c < 40; c++) {
      var nm = name();
      var col = c < 20 ? colleges[c] : randomCollege();
      var inactive = c === 7 || c === 19 || c === 26 || c === 33 || c === 38;
      champions.push({
        id: "c" + c,
        name: nm,
        college: col,
        role: CH_ROLES[(c * 7) % CH_ROLES.length],
        code: code(nm),
        createdAt: new Date(tsFor(1, 9, 18)).toISOString(),
        day: 1,
        demo: true,
        _perf: inactive ? 0 : 0.4 + Math.pow(rnd(), 2.2) * 9,
      });
    }

    /* ---- registrations, day by day, in time order ---- */
    var regs = [];
    var refCount = {};
    var students = [];
    var events = [];
    var addEvent = function (day, type, source, variant, count) {
      if (count > 0) events.push({ day: day, type: type, source: source, variant: variant, count: count });
    };

    DAILY.forEach(function (plan, di) {
      var day = di + 1;
      var slots = [];
      Object.keys(plan).forEach(function (ch) {
        for (var k = 0; k < plan[ch]; k++) slots.push({ ch: ch, ts: tsFor(day) });
      });
      slots.sort(function (a, b) { return a.ts - b.ts; });

      var dayVariantRegs = {};
      slots.forEach(function (s) {
        var nm = name();
        var college = randomCollege();
        var referredBy = "";
        if (s.ch === "whatsapp") {
          var champ = weighted(champions, function (x) { return x._perf; });
          referredBy = champ.code;
          if (rnd() < 0.86) college = champ.college;
        } else if (s.ch === "referral" && students.length) {
          var ref = weighted(students, function (x) { return 1 + (refCount[x.code] || 0) * 2.4; });
          referredBy = ref.code;
          if (rnd() < 0.75) college = ref.college;
        } else if (s.ch === "email") {
          college = colleges[pick(TPO)];
        }
        var variant = rnd() < 0.555 ? "B" : "A";
        var gy = rnd();
        var rec = {
          id: "r" + regs.length,
          name: nm,
          college: college,
          branch: weighted(BRANCH_W, function (b) { return b[1]; })[0],
          gradYear: gy < 0.92 ? 2027 : gy < 0.98 ? 2028 : 2026,
          code: code(nm),
          referredBy: referredBy,
          source: s.ch,
          medium: MEDIUM[s.ch],
          campaign: "ai60",
          variant: variant,
          role: "student",
          createdAt: new Date(s.ts).toISOString(),
          day: day,
          demo: true,
        };
        if (referredBy) refCount[referredBy] = (refCount[referredBy] || 0) + 1;
        regs.push(rec);
        students.push(rec);
        var key = s.ch + "|" + variant;
        dayVariantRegs[key] = (dayVariantRegs[key] || 0) + 1;
      });

      /* ---- funnel events for the day ---- */
      Object.keys(plan).forEach(function (ch) {
        var n = plan[ch];
        if (!n) return;
        var conv = C.channels[ch].conv * (0.88 + rnd() * 0.24);
        var visits = Math.round(n / conv);
        var va = Math.round(visits / 2), vb = visits - va;
        addEvent(day, "visit", ch, "A", va);
        addEvent(day, "visit", ch, "B", vb);
        var formRate = 0.62 + rnd() * 0.06; // ~35% abandon the form
        var fa = Math.round((dayVariantRegs[ch + "|A"] || 0) / formRate);
        var fb = Math.round((dayVariantRegs[ch + "|B"] || 0) / formRate);
        addEvent(day, "form_start", ch, "A", fa);
        addEvent(day, "form_start", ch, "B", fb);
        addEvent(day, "share", ch, "A", Math.round((dayVariantRegs[ch + "|A"] || 0) * (0.3 + rnd() * 0.1)));
        addEvent(day, "share", ch, "B", Math.round((dayVariantRegs[ch + "|B"] || 0) * (0.3 + rnd() * 0.1)));
      });
    });

    champions.forEach(function (c) { delete c._perf; });
    return { registrations: regs, champions: champions, events: events };
  }

  return {
    get: function () {
      if (!cache) cache = generate();
      return cache;
    },
    DAILY: DAILY,
  };
})();

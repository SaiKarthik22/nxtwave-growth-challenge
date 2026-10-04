/**
 * BuildAI·60: free backend on Google Sheets + Apps Script
 * ------------------------------------------------------------------
 * Setup (5 minutes, see docs/BACKEND_SETUP.md):
 *   1. Create a Google Sheet → Extensions → Apps Script → paste this file.
 *   2. Deploy → New deployment → Web app → Execute as: Me, Access: Anyone.
 *   3. Copy the /exec URL into js/config.js → backendUrl.
 *
 * Endpoints
 *   POST {action:"register", data}   → { ok, existing, registration }
 *   POST {action:"champion", data}   → { ok, existing, champion }
 *   POST {action:"event",    data}   → { ok }
 *   GET  ?action=stats               → { ok, registrations, champions, events }  (public, sanitised)
 *   GET  ?action=ping                → { ok }
 *
 * Privacy: phone numbers and emails are stored in the sheet but NEVER
 * returned by GET. Names are shortened to "First L." in public output.
 */

var SHEETS = {
  Registrations: ["createdAt", "name", "phone", "email", "college", "branch", "gradYear", "code", "referredBy", "source", "medium", "campaign", "variant", "waOptIn"],
  Champions: ["createdAt", "name", "phone", "email", "college", "role", "code"],
  Events: ["ts", "date", "type", "source", "variant", "ref", "sid"],
};
var CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/* ------------------------------ HTTP ------------------------------ */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "stats";
  if (action === "ping") return json_({ ok: true, time: new Date().toISOString() });
  if (action === "stats") return json_(stats_());
  return json_({ ok: false, error: "unknown action" });
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
  } catch (err) {
    return json_({ ok: false, error: "invalid JSON" });
  }
  var data = body.data || {};
  try {
    if (body.action === "register") return json_(register_(data));
    if (body.action === "champion") return json_(champion_(data));
    if (body.action === "event") { logEvent_(data); return json_({ ok: true }); }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
  return json_({ ok: false, error: "unknown action" });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------------------- actions ----------------------------- */

function register_(d) {
  var p = cleanPerson_(d);
  if (!p.name || p.phone.length !== 10 || !/^\S+@\S+\.\S+$/.test(p.email)) {
    return { ok: false, error: "Missing or invalid name / phone / email" };
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var rows = rows_("Registrations");
    var dup = rows.filter(function (r) { return String(r.phone) === p.phone || String(r.email).toLowerCase() === p.email; })[0];
    if (dup) return { ok: true, existing: true, registration: publicReg_(dup) };

    var code = uniqueCode_(clean_(d.code, 12).toUpperCase(), p.name);
    var referredBy = clean_(d.referredBy, 12).toUpperCase();
    if (referredBy === code) referredBy = "";
    var rec = {
      createdAt: new Date().toISOString(),
      name: p.name, phone: p.phone, email: p.email, college: p.college,
      branch: clean_(d.branch, 40), gradYear: clean_(d.gradYear, 6),
      code: code, referredBy: referredBy,
      source: clean_(d.source, 20) || "direct", medium: clean_(d.medium, 30), campaign: clean_(d.campaign, 40),
      variant: d.variant === "B" ? "B" : "A", waOptIn: d.waOptIn === false ? "no" : "yes",
    };
    append_("Registrations", rec);
    return { ok: true, existing: false, registration: publicReg_(rec) };
  } finally {
    lock.releaseLock();
  }
}

function champion_(d) {
  var p = cleanPerson_(d);
  if (!p.name || p.phone.length !== 10 || !/^\S+@\S+\.\S+$/.test(p.email)) {
    return { ok: false, error: "Missing or invalid name / phone / email" };
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var rows = rows_("Champions");
    var dup = rows.filter(function (r) { return String(r.phone) === p.phone || String(r.email).toLowerCase() === p.email; })[0];
    if (dup) return { ok: true, existing: true, champion: publicChamp_(dup) };
    var rec = {
      createdAt: new Date().toISOString(),
      name: p.name, phone: p.phone, email: p.email, college: p.college,
      role: clean_(d.role, 40) || "Student Volunteer",
      code: uniqueCode_(clean_(d.code, 12).toUpperCase(), p.name),
    };
    append_("Champions", rec);
    return { ok: true, existing: false, champion: publicChamp_(rec) };
  } finally {
    lock.releaseLock();
  }
}

function logEvent_(d) {
  var type = clean_(d.type, 20);
  if (["visit", "form_start", "share", "register"].indexOf(type) < 0) return;
  var ts = Number(d.ts) || Date.now();
  append_("Events", {
    ts: new Date(ts).toISOString(),
    date: Utilities.formatDate(new Date(ts), "Asia/Kolkata", "yyyy-MM-dd"),
    type: type,
    source: clean_(d.source, 20) || "direct",
    variant: d.variant === "B" ? "B" : "A",
    ref: clean_(d.ref, 12),
    sid: clean_(d.sid, 40),
  });
}

function stats_() {
  var agg = {};
  rows_("Events").forEach(function (e) {
    var key = [e.date, e.type, e.source, e.variant].join("|");
    agg[key] = (agg[key] || 0) + 1;
  });
  var events = Object.keys(agg).map(function (k) {
    var p = k.split("|");
    return { date: p[0], type: p[1], source: p[2], variant: p[3], count: agg[k] };
  });
  return {
    ok: true,
    registrations: rows_("Registrations").map(publicReg_),
    champions: rows_("Champions").map(publicChamp_),
    events: events,
  };
}

/* ---------------------------- helpers ----------------------------- */

function sheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    // Plain-text format stops Sheets from turning codes/phones into numbers or dates
    sh.getRange(1, 1, sh.getMaxRows(), SHEETS[name].length).setNumberFormat("@");
    sh.appendRow(SHEETS[name]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, SHEETS[name].length).setFontWeight("bold");
  }
  return sh;
}

function rows_(name) {
  var values = sheet_(name).getDataRange().getValues();
  var head = values.shift() || [];
  return values.map(function (row) {
    var o = {};
    head.forEach(function (h, i) {
      var v = row[i];
      o[h] = v instanceof Date ? v.toISOString() : v;
    });
    return o;
  });
}

function append_(name, rec) {
  var sh = sheet_(name);
  var row = SHEETS[name].map(function (h) { return safeCell_(rec[h]); });
  sh.appendRow(row);
}

// Spreadsheet formula-injection guard: never store a cell that starts with = + - @
function safeCell_(v) {
  var s = v == null ? "" : String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function clean_(v, max) {
  return String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max || 100);
}

function cleanPerson_(d) {
  return {
    name: clean_(d.name, 60).replace(/\s+/g, " "),
    phone: String(d.phone || "").replace(/\D/g, "").slice(-10),
    email: clean_(d.email, 120).toLowerCase(),
    college: clean_(d.college, 90),
  };
}

function uniqueCode_(proposed, name) {
  var taken = {};
  rows_("Registrations").concat(rows_("Champions")).forEach(function (r) { taken[r.code] = true; });
  if (proposed && /^[A-Z]{3,4}-[A-Z0-9]{3,4}$/.test(proposed) && !taken[proposed]) return proposed;
  var base = String(name).toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
  if (base.length < 3) base = (base + "BLDR").slice(0, 4);
  for (var i = 0; i < 100; i++) {
    var c = base + "-";
    for (var j = 0; j < 3; j++) c += CODE_ALPHABET.charAt(Math.floor(Math.random() * CODE_ALPHABET.length));
    if (!taken[c]) return c;
  }
  return base + "-" + Date.now().toString(36).slice(-4).toUpperCase();
}

function shortName_(n) {
  var parts = String(n || "").trim().split(/\s+/);
  if (!parts[0]) return "Someone";
  return parts.length > 1 ? parts[0] + " " + parts[parts.length - 1].charAt(0).toUpperCase() + "." : parts[0];
}

function publicReg_(r) {
  return {
    name: shortName_(r.name), college: r.college, branch: r.branch, gradYear: r.gradYear,
    code: r.code, referredBy: r.referredBy, source: r.source, medium: r.medium,
    variant: r.variant, role: "student", createdAt: r.createdAt,
  };
}

function publicChamp_(c) {
  return { name: shortName_(c.name), college: c.college, role: c.role, code: c.code, createdAt: c.createdAt };
}

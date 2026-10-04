/* =========================================================
   BuildAI·60 — Data layer
   - Attribution: utm_* + ?ref= (last non-direct touch wins)
   - A/B headline variant (sticky per browser, ?v=A|B to force)
   - Event tracking: visit / form_start / register / share
   - Registrations + Campus Champions (dedupe by phone/email)
   - Storage: localStorage by default, or a Google Apps Script
     backend when CONFIG.backendUrl is set
   - Datasets: seeded demo simulation merged with live data
   ========================================================= */
window.Store = (function () {
  "use strict";
  var C = window.CONFIG;
  var K = {
    regs: "b60.regs", champs: "b60.champs", events: "b60.events",
    me: "b60.me", champ: "b60.champ", variant: "b60.variant", attr: "b60.attr",
  };
  var memory = {}; // fallback when storage is blocked (private mode, sandboxed previews)

  function read(key, fallback) {
    try {
      var v = window.localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) {
      return key in memory ? memory[key] : fallback;
    }
  }
  function write(key, val) {
    memory[key] = val;
    try { window.localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* memory fallback */ }
  }
  function session(key, val) {
    try {
      if (val === undefined) return window.sessionStorage.getItem(key);
      window.sessionStorage.setItem(key, val);
    } catch (e) { return null; }
  }

  function isRemote() { return !!(C.backendUrl && /^https:\/\//.test(C.backendUrl)); }

  function randInt(n) {
    if (window.crypto && crypto.getRandomValues) {
      var a = new Uint32Array(1);
      crypto.getRandomValues(a);
      return a[0] % n;
    }
    return Math.floor(Math.random() * n);
  }
  function uid() { return Date.now().toString(36) + randInt(1e9).toString(36); }

  /* ---------- attribution ---------- */
  var params = new URLSearchParams(window.location.search);

  function normalizeSource(s) {
    s = String(s || "").toLowerCase().trim();
    if (!s) return "direct";
    if (/^(wa|whatsapp|wa\.me|champion)$/.test(s)) return "whatsapp";
    if (/^(ig|insta|instagram)$/.test(s)) return "instagram";
    if (/^(li|linkedin)$/.test(s)) return "linkedin";
    if (/^(email|mail|tpo|club|clubs|placement)$/.test(s)) return "email";
    if (/^(ref|referral|friend|share)$/.test(s)) return "referral";
    return C.channels[s] ? s : "direct";
  }

  function classifyReferrer(ref) {
    if (!ref) return "direct";
    try {
      var host = new URL(ref).hostname;
      if (host === window.location.hostname) return "direct";
      if (/instagram/.test(host)) return "instagram";
      if (/linkedin|lnkd/.test(host)) return "linkedin";
      if (/whatsapp|wa\.me/.test(host)) return "whatsapp";
      if (/mail/.test(host)) return "email";
    } catch (e) { /* ignore */ }
    return "direct";
  }

  function cleanCode(s) { return String(s || "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 12); }

  function captureAttribution() {
    var prev = read(K.attr, null);
    var ref = cleanCode(params.get("ref"));
    var src = params.get("utm_source") || params.get("src") || "";
    var attr = null;
    if (ref) {
      attr = { ref: ref, source: normalizeSource(src || "referral"), medium: (params.get("utm_medium") || "link").toLowerCase(), campaign: (params.get("utm_campaign") || "").toLowerCase() };
    } else if (src) {
      attr = { ref: "", source: normalizeSource(src), medium: (params.get("utm_medium") || "").toLowerCase(), campaign: (params.get("utm_campaign") || "").toLowerCase() };
    } else if (!prev) {
      var s = classifyReferrer(document.referrer);
      attr = { ref: "", source: s, medium: s === "direct" ? "" : "organic", campaign: "" };
    }
    if (attr) {
      attr.at = Date.now();
      write(K.attr, attr);
      return attr;
    }
    return prev || { ref: "", source: "direct", medium: "", campaign: "" };
  }

  function pickVariant() {
    var forced = String(params.get("v") || "").toUpperCase();
    if (forced === "A" || forced === "B") { write(K.variant, forced); return forced; }
    var v = read(K.variant, null);
    if (v !== "A" && v !== "B") { v = randInt(2) ? "B" : "A"; write(K.variant, v); }
    return v;
  }

  var attribution = captureAttribution();
  var variant = pickVariant();

  function sid() {
    var s = session("b60.sid");
    if (!s) { s = uid(); session("b60.sid", s); }
    return s;
  }

  /* ---------- remote transport (Google Apps Script) ---------- */
  // Body is sent as text/plain, a "simple" CORS request with no preflight. Apps Script handles it.
  function post(body, fireAndForget) {
    var opts = { method: "POST", body: JSON.stringify(body) };
    if (fireAndForget) {
      opts.mode = "no-cors";
      opts.keepalive = true;
      return fetch(C.backendUrl, opts).catch(function () {});
    }
    return fetch(C.backendUrl, opts).then(function (r) { return r.json(); });
  }

  /* ---------- events ---------- */
  function track(type, extra) {
    var ev = { t: type, s: attribution.source || "direct", v: variant, r: attribution.ref || "", ts: Date.now() };
    if (extra && extra.channel) ev.c = extra.channel;
    var list = read(K.events, []);
    list.push(ev);
    if (list.length > 4000) list = list.slice(-4000);
    write(K.events, list);
    if (isRemote()) {
      post({ action: "event", data: { type: type, source: ev.s, variant: ev.v, ref: ev.r, sid: sid(), ts: ev.ts } }, true);
    }
    invalidate();
  }

  function trackOnce(type) {
    var key = "b60.once." + type + "." + (document.body.getAttribute("data-page") || "");
    if (session(key)) return;
    session(key, "1");
    track(type);
  }

  function istDate(ts) {
    var d = new Date(ts + 330 * 60000);
    return d.toISOString().slice(0, 10);
  }

  function aggregateLocalEvents() {
    var map = {};
    read(K.events, []).forEach(function (e) {
      var key = istDate(e.ts) + "|" + e.t + "|" + e.s + "|" + e.v;
      map[key] = (map[key] || 0) + 1;
    });
    return Object.keys(map).map(function (k) {
      var p = k.split("|");
      return { date: p[0], type: p[1], source: p[2], variant: p[3], count: map[k] };
    });
  }

  /* ---------- people ---------- */
  var ALPH = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  function makeCode(name, taken) {
    var base = String(name || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
    if (base.length < 3) base = (base + "BLDR").slice(0, 4);
    for (var i = 0; i < 60; i++) {
      var c = base + "-" + ALPH[randInt(ALPH.length)] + ALPH[randInt(ALPH.length)] + ALPH[randInt(ALPH.length)];
      if (!taken || !taken[c]) return c;
    }
    return base + "-" + uid().slice(-4).toUpperCase();
  }

  function takenCodes() {
    var t = {};
    var s = window.Seed ? Seed.get() : { registrations: [], champions: [] };
    s.registrations.concat(s.champions, read(K.regs, []), read(K.champs, [])).forEach(function (p) { t[p.code] = 1; });
    return t;
  }

  function displayName(name) {
    var parts = String(name || "").trim().split(/\s+/);
    if (!parts[0]) return "Someone";
    if (parts.length === 1) return parts[0];
    return parts[0] + " " + parts[parts.length - 1].charAt(0).toUpperCase() + ".";
  }

  function normalizePerson(input) {
    return {
      name: String(input.name || "").trim().replace(/\s+/g, " ").slice(0, 60),
      phone: String(input.phone || "").replace(/\D/g, "").slice(-10),
      email: String(input.email || "").trim().toLowerCase().slice(0, 120),
      college: String(input.college || "").trim().slice(0, 90),
    };
  }

  function upsert(key, rec) {
    var list = read(key, []);
    var i = list.findIndex(function (r) { return r.phone === rec.phone || r.email === rec.email; });
    if (i >= 0) list[i] = rec; else list.push(rec);
    write(key, list);
  }

  function register(input) {
    var p = normalizePerson(input);
    // block self-referral by person (same phone or email as the code's owner), not by device,
    // so a friend registering on a shared phone or laptop is still credited
    var owner = attribution.ref ? read(K.regs, []).concat(read(K.champs, [])).find(function (r) { return r.code === attribution.ref; }) : null;
    var selfRef = !!(owner && (owner.phone === p.phone || owner.email === p.email));
    var ref = selfRef ? "" : attribution.ref;
    var existing = read(K.regs, []).find(function (r) { return r.phone === p.phone || r.email === p.email; });
    if (existing && !isRemote()) {
      write(K.me, existing.code);
      return Promise.resolve({ ok: true, existing: true, registration: existing });
    }
    var rec = Object.assign(p, {
      id: uid(),
      branch: String(input.branch || ""),
      gradYear: Number(input.gradYear) || "",
      code: makeCode(p.name, takenCodes()),
      referredBy: ref,
      source: selfRef ? "direct" : ref && !attribution.source ? "referral" : attribution.source || "direct",
      medium: selfRef ? "" : attribution.medium || "",
      campaign: attribution.campaign || "",
      variant: variant,
      role: "student",
      createdAt: new Date().toISOString(),
    });
    var finish = function (saved, extra) {
      upsert(K.regs, saved);
      write(K.me, saved.code);
      track("register");
      return Object.assign({ ok: true, existing: false, registration: saved }, extra || {});
    };
    if (!isRemote()) return Promise.resolve(finish(rec));
    return post({ action: "register", data: rec })
      .then(function (res) {
        if (!res || !res.ok) throw new Error((res && res.error) || "Registration failed");
        return finish(Object.assign({}, rec, res.registration || {}), { existing: !!res.existing });
      })
      .catch(function (err) {
        // Never block a student: keep the seat locally and surface the sync problem
        return finish(rec, { offline: true, error: String(err && err.message || err) });
      });
  }

  function addChampion(input) {
    var p = normalizePerson(input);
    var existing = read(K.champs, []).find(function (r) { return r.phone === p.phone || r.email === p.email; });
    if (existing && !isRemote()) {
      write(K.champ, existing.code);
      return Promise.resolve({ ok: true, existing: true, champion: existing });
    }
    var rec = Object.assign(p, {
      id: uid(),
      role: String(input.role || "Student Volunteer"),
      code: makeCode(p.name, takenCodes()),
      createdAt: new Date().toISOString(),
    });
    var finish = function (saved, extra) {
      upsert(K.champs, saved);
      write(K.champ, saved.code);
      invalidate();
      return Object.assign({ ok: true, existing: false, champion: saved }, extra || {});
    };
    if (!isRemote()) return Promise.resolve(finish(rec));
    return post({ action: "champion", data: rec })
      .then(function (res) {
        if (!res || !res.ok) throw new Error((res && res.error) || "Could not save champion");
        return finish(Object.assign({}, rec, res.champion || {}), { existing: !!res.existing });
      })
      .catch(function (err) { return finish(rec, { offline: true, error: String(err && err.message || err) }); });
  }

  function myCode() { return read(K.me, null); }
  function myChampionCode() { return read(K.champ, null); }
  function myRegistration() {
    var code = myCode();
    return code ? read(K.regs, []).find(function (r) { return r.code === code; }) || null : null;
  }
  function myChampion() {
    var code = myChampionCode();
    return code ? read(K.champs, []).find(function (r) { return r.code === code; }) || null : null;
  }

  /* ---------- datasets ---------- */
  var cache = null, cacheAt = 0;
  function invalidate() { cache = null; }

  function localLive() {
    return {
      registrations: read(K.regs, []),
      champions: read(K.champs, []),
      events: aggregateLocalEvents(),
    };
  }

  function getLive(force) {
    if (!isRemote()) return Promise.resolve(localLive());
    if (!force && cache && Date.now() - cacheAt < 20000) return Promise.resolve(cache);
    return fetch(C.backendUrl + "?action=stats", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok) throw new Error("bad response");
        cache = { registrations: d.registrations || [], champions: d.champions || [], events: d.events || [] };
        cacheAt = Date.now();
        return cache;
      })
      .catch(function () { return localLive(); });
  }

  function dateToTs(date) { return new Date(date + "T12:00:00+05:30").getTime(); }

  function getDataset(opts) {
    opts = opts || {};
    var demo = opts.demo != null ? opts.demo : C.demoMode;
    var upTo = opts.upToDay || C.campaignDays;
    return getLive(opts.force).then(function (live) {
      var regs = [], champs = [], events = [];
      if (demo && window.Seed) {
        var s = Seed.get();
        regs = s.registrations.filter(function (r) { return r.day <= upTo; });
        champs = s.champions.slice();
        events = s.events.filter(function (e) { return e.day <= upTo; });
      }
      // In demo mode your real activity lands on the simulated "today"
      var dayFor = function (ts) { return demo ? upTo : C.dayOf(ts); };
      live.registrations.forEach(function (r) {
        var d = dayFor(r.createdAt);
        if (d <= upTo) regs.push(Object.assign({}, r, { day: d, live: true }));
      });
      live.champions.forEach(function (c) { champs.push(Object.assign({}, c, { day: dayFor(c.createdAt), live: true })); });
      live.events.forEach(function (e) {
        var d = demo ? upTo : C.dayOf(dateToTs(e.date));
        if (d <= upTo && e.type !== "register") {
          events.push({ day: d, type: e.type, source: e.source, variant: e.variant, count: Number(e.count) || 0, live: true });
        }
      });
      return { registrations: regs, champions: champs, events: events, demo: demo, upTo: upTo, remote: isRemote() };
    });
  }

  function referralCounts(regs) {
    var m = {};
    regs.forEach(function (r) { if (r.referredBy) m[r.referredBy] = (m[r.referredBy] || 0) + 1; });
    return m;
  }

  function findByCode(ds, code) {
    code = cleanCode(code);
    if (!code) return null;
    var r = ds.registrations.find(function (x) { return x.code === code; });
    if (r) return Object.assign({ kind: "student" }, r);
    var c = ds.champions.find(function (x) { return x.code === code; });
    return c ? Object.assign({ kind: "champion" }, c) : null;
  }

  function clearLocal() {
    Object.keys(K).forEach(function (k) {
      try { window.localStorage.removeItem(K[k]); } catch (e) { /* ignore */ }
      delete memory[K[k]];
    });
    invalidate();
  }

  return {
    attribution: function () { return attribution; },
    variant: function () { return variant; },
    isRemote: isRemote,
    track: track,
    trackOnce: trackOnce,
    register: register,
    addChampion: addChampion,
    myCode: myCode,
    myChampionCode: myChampionCode,
    myRegistration: myRegistration,
    myChampion: myChampion,
    getLive: getLive,
    getDataset: getDataset,
    referralCounts: referralCounts,
    findByCode: findByCode,
    displayName: displayName,
    cleanCode: cleanCode,
    clearLocal: clearLocal,
    invalidate: invalidate,
  };
})();

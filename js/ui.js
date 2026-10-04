/* =========================================================
   BuildAI·60 — Shared UI: nav, footer, reveal, effects, helpers
   ========================================================= */
window.UI = (function () {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var finePointer = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmt(n) { return Math.round(Number(n) || 0).toLocaleString("en-IN"); }
  function pct(n, d) { return ((Number(n) || 0) * 100).toFixed(d == null ? 1 : d) + "%"; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  var AV = [
    "linear-gradient(135deg,#a99bff,#6aeef7)",
    "linear-gradient(135deg,#6aeef7,#c3f75c)",
    "linear-gradient(135deg,#ffb547,#ff5d8f)",
    "linear-gradient(135deg,#c3f75c,#3ee6a0)",
    "linear-gradient(135deg,#ff5d8f,#a99bff)",
    "linear-gradient(135deg,#3ee6a0,#2fe3f0)",
  ];
  function avatarBg(name) { return AV[hash(String(name || "?")) % AV.length]; }
  function initials(name) {
    var parts = String(name || "?").trim().split(/\s+/);
    return ((parts[0] || "?")[0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  }
  function avatar(name) {
    return '<span class="avatar" style="--av:' + avatarBg(name) + '" aria-hidden="true">' + esc(initials(name)) + "</span>";
  }
  function dateFmt(d, opts) {
    return new Date(d).toLocaleString("en-IN", Object.assign({ timeZone: "Asia/Kolkata" }, opts || {}));
  }

  /* ---------- header / footer ---------- */
  var NAV = [
    { href: "index.html", label: "Workshop", page: "home" },
    { href: "referral.html", label: "Referral Hub", page: "hub" },
    { href: "dashboard.html", label: "Command Center", page: "dashboard" },
  ];

  function renderHeader() {
    var slot = $("#site-header");
    if (!slot) return;
    var page = document.body.getAttribute("data-page");
    var links = NAV.map(function (l) {
      var active = l.page === page;
      return '<a href="' + l.href + '"' + (active ? ' class="active" aria-current="page"' : "") + ">" + l.label + "</a>";
    }).join("");
    slot.outerHTML =
      '<a class="skip-link" href="#main">Skip to content</a>' +
      '<header class="site-nav" id="site-nav">' +
        '<div class="container nav-inner">' +
          '<a href="index.html" class="logo" aria-label="BuildAI·60 home">' +
            '<span class="logo-mark">AI</span>' +
            '<span>BuildAI<span class="grad-text">·60</span><small>NXTWAVE · CONCEPT</small></span>' +
          "</a>" +
          '<nav class="nav-links" id="nav-links" aria-label="Primary">' + links + "</nav>" +
          '<div class="nav-actions">' +
            '<a class="btn btn-primary btn-sm btn-nav-cta magnetic" href="index.html#register">Reserve free seat</a>' +
            '<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-links" aria-label="Open menu"><span></span></button>' +
          "</div>" +
        "</div>" +
      "</header>";

    var nav = $("#site-nav");
    var toggle = $(".nav-toggle");
    toggle.addEventListener("click", function () {
      var open = !document.body.classList.contains("nav-open");
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    $$("#nav-links a").forEach(function (a) {
      a.addEventListener("click", function () {
        document.body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
    var onScroll = function () { nav.classList.toggle("scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function renderFooter() {
    var slot = $("#site-footer");
    if (!slot) return;
    var year = new Date().getFullYear();
    slot.outerHTML =
      '<footer class="site-footer">' +
        '<div class="container">' +
          '<div class="footer-grid">' +
            "<div>" +
              '<a href="index.html" class="logo"><span class="logo-mark">AI</span><span>BuildAI<span class="grad-text">·60</span></span></a>' +
              '<p class="muted small mt-16" style="max-width:42ch">A referral-powered growth engine to get 500 final-year engineers into NxtWave\'s free workshop, <em>"Build Your First AI Project in 60 Minutes"</em>. ₹2,000 budget, 7 days.</p>' +
            "</div>" +
            "<div><h4>For students</h4><ul>" +
              '<li><a href="index.html#projects">What you\'ll build</a></li>' +
              '<li><a href="index.html#register">Reserve a free seat</a></li>' +
              '<li><a href="referral.html">Referral Hub &amp; leaderboard</a></li>' +
              '<li><a href="referral.html#champion">Become a Campus Champion</a></li>' +
            "</ul></div>" +
            "<div><h4>For the growth team</h4><ul>" +
              '<li><a href="dashboard.html">Growth Command Center</a></li>' +
              '<li><a href="referral.html#leaderboard">Live leaderboards</a></li>' +
              '<li><a href="referral.html#champion">Campus Champion kit</a></li>' +
              (window.CONFIG && CONFIG.repoUrl ? '<li><a href="' + esc(CONFIG.repoUrl) + '" target="_blank" rel="noopener">Source code on GitHub ↗</a></li>' : "") +
            "</ul></div>" +
          "</div>" +
          '<div class="footer-bottom">' +
            "<span>© " + year + " BuildAI·60: concept prototype for the NxtWave Growth Intern challenge. Not an official NxtWave page.</span>" +
            "<span>Built with vanilla HTML/CSS/JS · ₹0 stack</span>" +
          "</div>" +
        "</div>" +
      "</footer>";
  }

  function renderDemoFlag() {
    if (!window.CONFIG || !CONFIG.demoMode) return;
    if (document.body.getAttribute("data-demo-flag") !== "true") return;
    var el = document.createElement("div");
    el.className = "demo-flag";
    el.textContent = "Demo data";
    el.title = "Prototype: counters and leaderboards blend a simulated 7-day campaign with real registrations made on this device. Set demoMode:false in js/config.js to turn it off.";
    document.body.appendChild(el);
  }

  /* ---------- reveal on scroll ---------- */
  function splitWords(el) {
    if (el.getAttribute("data-split-done")) return;
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement("span");
            w.className = "w";
            var inner = document.createElement("span");
            inner.style.setProperty("--i", i++);
            inner.textContent = part;
            w.appendChild(inner);
            frag.appendChild(w);
          });
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === 1 && !child.classList.contains("w")) {
          if (child.classList.contains("grad-text") || child.classList.contains("warm-text")) {
            // keep gradient spans intact: wrap the whole element as one "word"
            var w = document.createElement("span");
            w.className = "w";
            child.parentNode.insertBefore(w, child);
            var inner = document.createElement("span");
            inner.style.setProperty("--i", i++);
            w.appendChild(inner);
            inner.appendChild(child);
          } else {
            walk(child);
          }
        }
      });
    })(el);
    el.setAttribute("data-split-done", "1");
  }

  var revealObserver = null;
  function reveal(root) {
    var els = $$("[data-reveal], .split", root);
    $$(".split", root).forEach(splitWords);
    if (!("IntersectionObserver" in window) || reduceMotion) {
      els.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            revealObserver.unobserve(e.target);
          }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    }
    els.forEach(function (el) { if (!el.classList.contains("in")) revealObserver.observe(el); });
  }

  /* ---------- count-up ---------- */
  function countUp(el, to, opts) {
    opts = opts || {};
    var from = opts.from != null ? opts.from : Number(el.getAttribute("data-current")) || 0;
    var dec = opts.decimals || 0;
    var dur = opts.duration || 1600;
    var prefix = opts.prefix || "";
    var suffix = opts.suffix || "";
    var render = function (v) {
      el.textContent = prefix + (dec ? v.toFixed(dec) : Math.round(v).toLocaleString("en-IN")) + suffix;
    };
    el.setAttribute("data-current", to);
    if (reduceMotion || from === to) { render(to); return; }
    var start = performance.now();
    (function tick(now) {
      var t = Math.min(1, Math.max(0, (now - start) / dur)); // rAF timestamps can precede `start`
      var e = t === 1 ? 1 : 1 - Math.pow(2, -10 * t); // easeOutExpo
      render(from + (to - from) * e);
      if (t < 1) requestAnimationFrame(tick);
    })(start);
  }

  function observeCounters(root) {
    var els = $$("[data-count]", root);
    var run = function (el) {
      countUp(el, Number(el.getAttribute("data-count")), {
        decimals: Number(el.getAttribute("data-decimals")) || 0,
        prefix: el.getAttribute("data-prefix") || "",
        suffix: el.getAttribute("data-suffix") || "",
        from: 0,
      });
    };
    if (!("IntersectionObserver" in window)) { els.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- toast + clipboard ---------- */
  function toast(msg, type, icon) {
    var root = $(".toast-root");
    if (!root) {
      root = document.createElement("div");
      root.className = "toast-root";
      root.setAttribute("role", "status");
      root.setAttribute("aria-live", "polite");
      document.body.appendChild(root);
    }
    var t = document.createElement("div");
    t.className = "toast " + (type || "ok");
    t.innerHTML = '<span class="t-icon">' + (icon || (type === "err" ? "⚠️" : "✅")) + "</span><span>" + esc(msg) + "</span>";
    root.appendChild(t);
    setTimeout(function () {
      t.classList.add("out");
      setTimeout(function () { t.remove(); }, 320);
    }, 2800);
  }

  function copy(text, label) {
    var done = function () { toast((label || "Copied") + " to clipboard", "ok", "📋"); };
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    }
    fallback();
    return Promise.resolve();
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); } catch (e) { toast("Couldn't copy, please copy manually", "err"); }
      ta.remove();
    }
  }

  /* ---------- pointer effects ---------- */
  function spotlight() {
    document.addEventListener("pointermove", function (e) {
      var card = e.target.closest && e.target.closest(".spotlight");
      if (!card) return;
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", e.clientX - r.left + "px");
      card.style.setProperty("--my", e.clientY - r.top + "px");
    }, { passive: true });
  }

  function magnetic() {
    if (!finePointer || reduceMotion) return;
    document.addEventListener("pointermove", function (e) {
      var el = e.target.closest && e.target.closest(".magnetic");
      $$(".magnetic.is-mag").forEach(function (m) {
        if (m !== el) { m.style.transform = ""; m.classList.remove("is-mag"); }
      });
      if (!el) return;
      var r = el.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2);
      var dy = e.clientY - (r.top + r.height / 2);
      el.classList.add("is-mag");
      el.style.transform = "translate(" + dx * 0.18 + "px," + dy * 0.28 + "px)";
    }, { passive: true });
  }

  function tilt() {
    if (!finePointer || reduceMotion) return;
    $$("[data-tilt]").forEach(function (el) {
      el.style.transformStyle = "preserve-3d";
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = "perspective(900px) rotateX(" + (-py * 7).toFixed(2) + "deg) rotateY(" + (px * 9).toFixed(2) + "deg) translateY(-4px)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }

  /* ---------- tabs ---------- */
  function tabs(root, onChange) {
    var list = $$('[role="tab"]', root);
    list.forEach(function (tab) {
      tab.addEventListener("click", function () { select(tab); });
      tab.addEventListener("keydown", function (e) {
        var i = list.indexOf(tab);
        if (e.key === "ArrowRight") { e.preventDefault(); select(list[(i + 1) % list.length], true); }
        if (e.key === "ArrowLeft") { e.preventDefault(); select(list[(i - 1 + list.length) % list.length], true); }
      });
    });
    function select(tab, focus) {
      list.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
      if (onChange) onChange(tab);
    }
  }

  /* ---------- init ---------- */
  function init() {
    document.documentElement.classList.remove("no-js");
    renderHeader();
    renderFooter();
    renderDemoFlag();
    reveal();
    observeCounters();
    spotlight();
    magnetic();
    tilt();
  }
  init();

  return {
    $: $, $$: $$, esc: esc, fmt: fmt, pct: pct, clamp: clamp, hash: hash,
    avatar: avatar, avatarBg: avatarBg, initials: initials, dateFmt: dateFmt,
    reveal: reveal, countUp: countUp, observeCounters: observeCounters,
    toast: toast, copy: copy, tabs: tabs, tilt: tilt,
    reduceMotion: reduceMotion,
  };
})();

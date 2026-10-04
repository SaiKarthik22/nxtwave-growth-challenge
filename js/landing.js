/* =========================================================
   BuildAI·60 — Landing page behaviour
   Countdown, live counter, code-typing demo, college battle,
   reward tiers, activity toasts, sticky mobile CTA.
   ========================================================= */
(function () {
  "use strict";
  const C = window.CONFIG;
  const $ = UI.$, $$ = UI.$$;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  Store.trackOnce("visit");

  /* ---------- workshop date everywhere ---------- */
  const wDate = C.workshopDate();
  const dayLong = UI.dateFmt(wDate, { weekday: "long", day: "numeric", month: "short" });
  const dayShort = UI.dateFmt(wDate, { weekday: "short", day: "numeric", month: "short" });
  const time = UI.dateFmt(wDate, { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
  $("#hero-date").textContent = `${dayShort} · ${time} IST`;
  $("#cd-date").textContent = `${dayLong} · ${time} IST`;
  $("#meta-date").textContent = `${dayLong}, ${time} IST`;
  $("#final-date").textContent = `${dayShort}, ${time} IST`;

  /* ---------- countdown ---------- */
  const cd = {};
  $$(".cd-num").forEach((el) => (cd[el.dataset.unit] = el));
  const pad = (n) => String(Math.max(0, n)).padStart(2, "0");
  const setUnit = (unit, val) => {
    const el = cd[unit];
    if (!el || el.textContent === val) return;
    el.textContent = val;
    el.classList.remove("tick");
    void el.offsetWidth; // restart animation
    el.classList.add("tick");
  };
  function tick() {
    const diff = wDate.getTime() - Date.now();
    if (diff <= 0) {
      const live = diff > -C.workshop.durationMin * 60000;
      $("#countdown").classList.toggle("live", live);
      $(".countdown-bar .eyebrow").textContent = live ? "Happening now" : "This session has ended";
      ["d", "h", "m", "s"].forEach((u) => setUnit(u, "00"));
      return;
    }
    setUnit("d", pad(Math.floor(diff / 864e5)));
    setUnit("h", pad(Math.floor(diff / 36e5) % 24));
    setUnit("m", pad(Math.floor(diff / 6e4) % 60));
    setUnit("s", pad(Math.floor(diff / 1e3) % 60));
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- live code demo ---------- */
  const PROJECTS = [
    {
      file: "jd_decoder.py",
      code: `# jd_decoder.py · typed live at minute 30
import gradio as gr
from helper import ask   # our 3-line LLM helper

def decode(job_post, my_skills):
    prompt = (f"Job post:\\n{job_post}\\n"
              f"My skills: {my_skills}\\n"
              "List the must-have skills, my gaps "
              "and a 7-day plan to close them.")
    return ask(prompt)

gr.Interface(decode, ["text", "text"], "markdown",
    title="JD Decoder").launch(share=True)`,
      slug: "jd-decoder",
      app: {
        title: "JD Decoder",
        input: "TCS JD: Java, SQL, DSA basics · Me: Python, C",
        output: "<b>Match: 55%.</b> Gaps: SQL joins, Java OOP. <b>Day 1:</b> write 15 join queries on a sample table.",
      },
    },
    {
      file: "viva_prep.py",
      code: `# viva_prep.py · project 2 of 3
import gradio as gr
from helper import ask

def viva(subject, experiment):
    prompt = (f"My {subject} lab viva is on "
              f"'{experiment}'. Ask 5 questions "
              "an examiner is most likely to ask, "
              "each with a one-line answer.")
    return ask(prompt)

gr.Interface(viva, ["text", "text"], "markdown",
    title="Viva Prep").launch(share=True)`,
      slug: "viva-prep",
      app: {
        title: "Viva Prep",
        input: "DLD lab · Full adder with NAND gates",
        output: "<b>Q1.</b> How many NAND gates does a full adder need? <b>A:</b> Nine. <b>Q2.</b> Why is NAND called a universal gate?",
      },
    },
    {
      file: "error_explainer.py",
      code: `# error_explainer.py · project 3 of 3
import gradio as gr
from helper import ask

def explain(error, language):
    prompt = (f"Reply in {language}. Explain this "
              "error to a beginner, then show the "
              f"fixed line:\\n{error}")
    return ask(prompt)

lang = gr.Radio(["English", "Telugu"])
gr.Interface(explain, ["text", lang], "markdown",
    title="Error Explainer").launch(share=True)`,
      slug: "error-explainer",
      app: {
        title: "Error Explainer",
        input: "IndexError: list index out of range · Telugu",
        output: "<b>కారణం:</b> marks లో 5 items ఉన్నాయి, Python 0 నుండి లెక్కిస్తుంది, అందుకే marks[5] లేదు. <b>Fix:</b> range(len(marks)) వాడండి.",
      },
    },
  ];

  const TOKEN = /(#[^\n]*)|(f?"(?:[^"\\\n]|\\.)*")|\b(import|from|def|return|as|True|False|None)\b|\b(\d+)\b|\b([A-Za-z_]\w*)(?=\()/g;
  function tokenize(src) {
    const out = [];
    let last = 0, m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(src))) {
      if (m.index > last) out.push({ cls: "", text: src.slice(last, m.index) });
      const cls = m[1] ? "tok-c" : m[2] ? "tok-s" : m[3] ? "tok-k" : m[4] ? "tok-n" : "tok-f";
      out.push({ cls, text: m[0] });
      last = TOKEN.lastIndex;
    }
    if (last < src.length) out.push({ cls: "", text: src.slice(last) });
    return out;
  }
  // Each source line becomes a .code-line block, so CSS can number the lines in the gutter.
  function highlightedLines(src) {
    const lines = [[]];
    tokenize(src).forEach((s) => {
      s.text.split("\n").forEach((part, j) => {
        if (j > 0) lines.push([]);
        if (part) lines[lines.length - 1].push(s.cls ? `<span class="${s.cls}">${UI.esc(part)}</span>` : UI.esc(part));
      });
    });
    return lines.map((l) => `<span class="code-line">${l.join("")}</span>`).join("");
  }

  const body = $("#code-body"), term = $("#code-term"), preview = $("#app-preview"), fileEl = $("#code-file");
  let onScreen = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((e) => (onScreen = e[0].isIntersecting)).observe($("#code-window"));
  }
  const waitVisible = async () => { while (!onScreen || document.hidden) await sleep(300); };

  function termLines(p) {
    return [
      { html: `<span class="dim">$</span> python ${p.file}`, wait: 380 },
      { html: `<span class="spin">◐</span> loading helper.py + free API key…`, done: `<span class="ok">✓</span> model ready · llama-3.1-8b-instant`, wait: 380 },
      { html: `<span class="ok">✓</span> live: <span class="url">https://${p.slug}.gradio.live</span>`, wait: 420 },
      { html: `<span class="ok">✓</span> pushed: github.com/you/${p.slug}`, wait: 200 },
    ];
  }

  function previewHTML(p) {
    return `<div class="ap-head"><span>${p.app.title}</span><span class="badge badge-green">live</span></div>
      <div class="ap-url">${p.slug}.gradio.live</div>
      <div class="ap-box ap-in">${UI.esc(p.app.input)}</div>
      <div class="ap-box ap-out"></div>`;
  }

  async function typeCode(src) {
    body.innerHTML = "";
    const caret = document.createElement("span");
    caret.className = "caret";
    const newLine = () => {
      const l = document.createElement("span");
      l.className = "code-line";
      body.appendChild(l);
      l.appendChild(caret);
      return l;
    };
    let line = newLine();
    for (const seg of tokenize(src)) {
      let node = null;
      for (const ch of seg.text) {
        await waitVisible();
        if (ch === "\n") {
          line = newLine();
          node = null;
          await sleep(80);
          continue;
        }
        if (!node) {
          node = seg.cls ? document.createElement("span") : document.createTextNode("");
          if (seg.cls) node.className = seg.cls;
          line.insertBefore(node, caret);
        }
        node.textContent += ch;
        await sleep(11 + Math.random() * 22);
      }
    }
  }

  async function runTerminal(p) {
    term.innerHTML = "";
    for (const line of termLines(p)) {
      await waitVisible();
      const div = document.createElement("div");
      div.className = "ln";
      div.innerHTML = line.html;
      term.appendChild(div);
      if (line.done) { await sleep(950); div.innerHTML = line.done; }
      await sleep(line.wait);
    }
  }

  async function showPreview(p) {
    preview.innerHTML = previewHTML(p);
    preview.classList.add("show");
    const out = preview.querySelector(".ap-out");
    const plain = p.app.output.replace(/<[^>]+>/g, "");
    await sleep(450);
    for (const ch of plain) { out.textContent += ch; await sleep(16); }
    out.innerHTML = p.app.output;
  }

  async function demo() {
    if (UI.reduceMotion) {
      const p = PROJECTS[0];
      body.innerHTML = highlightedLines(p.code);
      term.innerHTML = termLines(p).map((l) => `<div>${l.done || l.html}</div>`).join("");
      preview.innerHTML = previewHTML(p);
      preview.querySelector(".ap-out").innerHTML = p.app.output;
      preview.classList.add("show");
      return;
    }
    for (let i = 0; ; i++) {
      const p = PROJECTS[i % PROJECTS.length];
      fileEl.textContent = p.file;
      preview.classList.remove("show");
      term.innerHTML = "";
      await typeCode(p.code);
      await sleep(300);
      await runTerminal(p);
      await showPreview(p);
      await sleep(4200);
    }
  }
  demo();

  /* ---------- reward tiers ---------- */
  $("#reward-tiers").innerHTML = C.rewards.map((r, i) => `
    <article class="card card-glow spotlight tier-card" data-reveal style="--d:${i * 120}">
      <span class="tier-icon">${r.icon}</span>
      <div class="tier-num">${r.at}<small>${r.at === 1 ? "friend" : "friends"}</small></div>
      <h3 class="h-card">${UI.esc(r.title).replace(/(\S+-\S+)/g, '<span class="nobr">$1</span>')}</h3>
      <p class="muted">${UI.esc(r.desc)}</p>
    </article>`).join("");
  $("#prize-referrer").textContent = C.topReferrerPrize;
  $("#prize-champion").textContent = C.championPrize;
  UI.reveal($("#reward-tiers"));

  /* ---------- live numbers ---------- */
  function renderStats(ds) {
    const n = ds.registrations.length;
    UI.countUp($("#hero-count"), n, { duration: 2000 });
    $("#sticky-count").textContent = UI.fmt(n);
    requestAnimationFrame(() => $("#hero-progress").style.setProperty("--p", Math.min(100, (n / C.goal) * 100).toFixed(1) + "%"));

    const recent = ds.registrations.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    $("#hero-avatars").innerHTML =
      recent.slice(0, 5).map((r) => UI.avatar(r.name)).join("") +
      (n > 5 ? `<span class="avatar" style="--av:var(--indigo-soft);--av-ink:var(--indigo);font-size:11px">+${n - 5 > 99 ? "99" : n - 5}</span>` : "");
    return recent;
  }

  function renderBattle(ds) {
    const counts = {};
    ds.registrations.forEach((r) => { if (r.college) counts[r.college] = (counts[r.college] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const max = top.length ? top[0][1] : 1;
    const mine = (Store.myRegistration() || {}).college;
    const wrap = $("#battle-bars");
    if (!top.length) {
      wrap.innerHTML = `<div class="empty"><span class="e-icon">🏁</span><b>The board is empty so far.</b>Sign up now and your college takes the first spot.</div>`;
      return;
    }
    wrap.innerHTML = top.map(([name, v], i) => `
      <div class="bb-row${name === mine ? " me" : ""}">
        <span class="bb-rank">#${i + 1}</span>
        <div class="bb-main">
          <span class="bb-name">${UI.esc(name)}${name === mine ? " · your campus" : ""}</span>
          <div class="bb-track"><div class="bb-fill" data-w="${((v / max) * 100).toFixed(1)}"></div></div>
        </div>
        <span class="bb-val">${v}</span>
      </div>`).join("");
    const fill = () => $$(".bb-fill", wrap).forEach((el) => (el.style.width = el.dataset.w + "%"));
    if (!("IntersectionObserver" in window)) return fill();
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) { fill(); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(wrap);
  }

  const VIA = {
    referral: "with a friend's link",
    whatsapp: "from a class group",
    email: "via the placement cell",
    instagram: "after the Insta reel",
    linkedin: "from LinkedIn",
    direct: "",
  };
  function activityToasts(recent) {
    if (!recent.length) return;
    const el = document.createElement("div");
    el.className = "activity-toast";
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
    const pool = recent.slice(0, 24);
    let i = 0;
    const schedule = () => setTimeout(show, 9000 + Math.random() * 6000);
    function show() {
      if (document.hidden) return schedule();
      const r = pool[i++ % pool.length];
      const via = VIA[r.source] || "";
      const tag = r.demo ? "demo data" : "a moment ago";
      el.innerHTML = UI.avatar(r.name) +
        `<div><b>${UI.esc(Store.displayName(r.name))}</b> from ${UI.esc(r.college)}` +
        `<span class="when">booked a seat ${via ? via + " " : ""}· ${tag}</span></div>`;
      el.classList.add("show");
      setTimeout(() => el.classList.remove("show"), 4800);
      schedule();
    }
    setTimeout(show, 5000);
  }

  let firstLoad = true;
  window.Landing = {
    refresh(force) {
      return Store.getDataset({ upToDay: C.demoDay, force }).then((ds) => {
        const recent = renderStats(ds);
        renderBattle(ds);
        if (firstLoad) { firstLoad = false; activityToasts(recent); }
        return ds;
      });
    },
  };
  Landing.refresh();

  /* ---------- sticky mobile CTA ---------- */
  const sticky = $("#sticky-cta");
  const heroCta = $('[data-cta="hero"]');
  const reg = $("#register");
  if (sticky && "IntersectionObserver" in window) {
    let heroVis = true, regVis = false;
    new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.target === heroCta) heroVis = e.isIntersecting;
        else regVis = e.isIntersecting;
      });
      sticky.classList.toggle("show", !heroVis && !regVis);
    }).observe(heroCta);
    new IntersectionObserver((entries) => {
      regVis = entries[0].isIntersecting;
      sticky.classList.toggle("show", !heroVis && !regVis);
    }).observe(reg);
  }
})();

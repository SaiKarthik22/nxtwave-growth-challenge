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
      $(".countdown-bar .eyebrow").textContent = live ? "Live right now" : "Workshop finished";
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
      file: "resume_roaster.py",
      code: `# resume_roaster.py · built live, minute 25
import gradio as gr
from helper import ask   # 3-line LLM helper

def roast(resume):
    prompt = ("Act like a strict tech recruiter. "
              "Roast this resume + give 3 fixes:\\n")
    return ask(prompt + resume)

gr.Interface(roast, "textbox", "markdown",
    title="Resume Roaster 🔥").launch(share=True)`,
      slug: "resume-roaster",
      app: {
        title: "Resume Roaster 🔥",
        input: "Final-year ECE · Python, C · 1 mini project…",
        output: '"Mini project" isn\'t a project. <b>Fix #1:</b> ship this app and put the link at the top.',
      },
    },
    {
      file: "interview_coach.py",
      code: `# interview_coach.py · project #2
import gradio as gr
from helper import ask

def coach(question, answer):
    prompt = (f"Q: {question}\\nA: {answer}\\n"
              "Score my answer /10, then improve it.")
    return ask(prompt)

gr.Interface(coach, ["textbox", "textbox"], "markdown",
    title="Interview Coach 🎤").launch(share=True)`,
      slug: "interview-coach",
      app: {
        title: "Interview Coach 🎤",
        input: "Q: Tell me about yourself. A: I'm from Guntur…",
        output: "<b>6/10.</b> Lead with what you built, not your hometown. Try: \"I'm an ECE student who shipped…\"",
      },
    },
    {
      file: "quiz_buddy.py",
      code: `# quiz_buddy.py · project #3
import gradio as gr
from helper import ask

def make_quiz(notes):
    prompt = ("Create 5 exam-style MCQs with answers "
              "from these notes:\\n")
    return ask(prompt + notes)

gr.Interface(make_quiz, "textbox", "markdown",
    title="Notes → Quiz Buddy 📚").launch(share=True)`,
      slug: "quiz-buddy",
      app: {
        title: "Notes → Quiz Buddy 📚",
        input: "Unit 3 · Operating Systems · Deadlocks…",
        output: "<b>Q1.</b> Which is NOT a necessary condition for deadlock? (a) Mutual exclusion (b) Preemption ✓",
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
  const highlighted = (src) => tokenize(src).map((s) => (s.cls ? `<span class="${s.cls}">${UI.esc(s.text)}</span>` : UI.esc(s.text))).join("");

  const body = $("#code-body"), term = $("#code-term"), preview = $("#app-preview"), fileEl = $("#code-file");
  let onScreen = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((e) => (onScreen = e[0].isIntersecting)).observe($("#code-window"));
  }
  const waitVisible = async () => { while (!onScreen || document.hidden) await sleep(300); };

  function termLines(p) {
    return [
      { html: `<span class="dim">$</span> python ${p.file}`, wait: 380 },
      { html: `<span class="spin">◐</span> connecting to free LLM API…`, done: `<span class="ok">✓</span> LLM connected · llama-3.1-8b-instant`, wait: 380 },
      { html: `<span class="ok">✓</span> Running on public URL: <span class="url">https://${p.slug}.gradio.live</span>`, wait: 420 },
      { html: `<span class="ok">✓</span> Pushed to github.com/you/${p.slug}`, wait: 200 },
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
    body.appendChild(caret);
    for (const seg of tokenize(src)) {
      const node = seg.cls ? document.createElement("span") : document.createTextNode("");
      if (seg.cls) node.className = seg.cls;
      body.insertBefore(node, caret);
      for (const ch of seg.text) {
        await waitVisible();
        node.textContent += ch;
        await sleep(ch === "\n" ? 80 : 11 + Math.random() * 22);
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
      body.innerHTML = highlighted(p.code);
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
      <h3 class="h-card">${UI.esc(r.title)}</h3>
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
      (n > 5 ? `<span class="avatar" style="--av:rgba(255,255,255,.12);color:var(--text);font-size:11px">+${n - 5 > 99 ? "99" : n - 5}</span>` : "");
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
      wrap.innerHTML = `<div class="empty"><span class="e-icon">🏁</span>No registrations yet. Be the first from your college!</div>`;
      return;
    }
    wrap.innerHTML = top.map(([name, v], i) => `
      <div class="bb-row${name === mine ? " me" : ""}">
        <span class="bb-rank">#${i + 1}</span>
        <div class="bb-main">
          <span class="bb-name">${UI.esc(name)}${name === mine ? " · your college" : ""}</span>
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
    referral: "via a friend's invite",
    whatsapp: "via their class WhatsApp group",
    email: "via the placement cell",
    instagram: "from Instagram",
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
      const tag = r.demo ? "demo data" : "just now";
      el.innerHTML = UI.avatar(r.name) +
        `<div><b>${UI.esc(Store.displayName(r.name))}</b> from ${UI.esc(r.college)} registered` +
        `<span class="when">${via ? via + " · " : ""}${tag}</span></div>`;
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

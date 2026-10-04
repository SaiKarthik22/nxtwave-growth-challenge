/* =========================================================
   BuildAI·60 — Growth Command Center
   Measure → Learn → Scale: KPIs, pace, channels vs plan,
   funnel, A/B significance, leaderboards, rule-based insights,
   day-by-day replay and CSV export.
   ========================================================= */
(function () {
  "use strict";
  const C = window.CONFIG;
  const $ = UI.$, $$ = UI.$$, esc = UI.esc;
  const CH = C.channels;
  const KEYS = Object.keys(CH);
  const D = C.campaignDays;
  const HEADLINES = {
    A: "Build Your First AI Project in 60 Minutes.",
    B: "Leave with a live AI project on your resume.",
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const sum = (arr) => arr.reduce((a, b) => a + (b || 0), 0);
  const chKey = (s) => (CH[s] ? s : "direct");

  let mode = C.demoMode ? "demo" : "live";
  let day = D;
  let lastDay = null;
  let playing = false;
  let lastDS = null, lastA = null;
  const prevKpi = {};

  /* ---------- analysis ---------- */
  function erf(x) { // Abramowitz–Stegun 7.1.26
    const s = Math.sign(x); x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  }
  const phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
  const confText = (pval) => { const c = (1 - pval) * 100; return c >= 99.9 ? ">99.9%" : Math.max(0, c).toFixed(1) + "%"; };

  function abTest(ds) {
    const v = { A: { visits: 0, regs: 0 }, B: { visits: 0, regs: 0 } };
    ds.events.forEach((e) => { if (e.type === "visit" && v[e.variant]) v[e.variant].visits += e.count; });
    ds.registrations.forEach((r) => { if (v[r.variant]) v[r.variant].regs++; });
    const pA = v.A.visits ? v.A.regs / v.A.visits : 0;
    const pB = v.B.visits ? v.B.regs / v.B.visits : 0;
    const n = v.A.visits + v.B.visits;
    const p = n ? (v.A.regs + v.B.regs) / n : 0;
    const se = v.A.visits && v.B.visits ? Math.sqrt(p * (1 - p) * (1 / v.A.visits + 1 / v.B.visits)) : 0;
    const z = se ? (pB - pA) / se : 0;
    const pval = se ? 2 * (1 - phi(Math.abs(z))) : 1;
    const winner = pB >= pA ? "B" : "A";
    const lose = winner === "B" ? pA : pB;
    const lift = lose ? (Math.max(pA, pB) - lose) / lose : 0;
    return { v, pA, pB, z, pval, winner, lift, significant: pval < 0.05 && Math.min(v.A.visits, v.B.visits) >= 100 };
  }

  function analyze(ds) {
    const upTo = ds.upTo;
    const regs = ds.registrations;
    const daily = Array(D).fill(0);
    const visitsDaily = Array(D).fill(0);
    regs.forEach((r) => { daily[Math.min(D, Math.max(1, r.day)) - 1]++; });
    let formStarts = 0, shares = 0;
    const bySource = {};
    KEYS.forEach((k) => (bySource[k] = { visits: 0, regs: 0 }));
    ds.events.forEach((e) => {
      if (e.type === "visit") { visitsDaily[Math.min(D, Math.max(1, e.day)) - 1] += e.count; bySource[chKey(e.source)].visits += e.count; }
      else if (e.type === "form_start") formStarts += e.count;
      else if (e.type === "share") shares += e.count;
    });
    regs.forEach((r) => bySource[chKey(r.source)].regs++);
    const total = regs.length;
    const visits = sum(visitsDaily);
    const referralRegs = bySource.referral.regs;
    const peer = regs.filter((r) => r.referredBy).length;
    const k = total - referralRegs > 0 ? referralRegs / (total - referralRegs) : 0;

    let c = 0;
    const cumulative = daily.map((v, i) => { c += v; return i < upTo ? c : null; });
    const bars = daily.map((v, i) => (i < upTo ? v : null));
    const target = Array.from({ length: D }, (_, i) => (C.goal * (i + 1)) / D);
    const last2 = daily.slice(Math.max(0, upTo - 2), upTo);
    const avg = last2.length ? sum(last2) / last2.length : 0;
    const projected = Math.round(total + avg * (D - upTo));
    const neededPerDay = D - upTo > 0 ? Math.max(0, Math.ceil((C.goal - total) / (D - upTo))) : 0;

    const counts = Store.referralCounts(regs);
    const byAge = (x, y) => new Date(x.createdAt) - new Date(y.createdAt);
    const champions = ds.champions.map((ch) => Object.assign({}, ch, { n: counts[ch.code] || 0 })).sort((x, y) => y.n - x.n || byAge(x, y));
    const referrers = regs.filter((r) => counts[r.code]).map((r) => Object.assign({}, r, { n: counts[r.code] })).sort((x, y) => y.n - x.n || byAge(x, y));
    const colMap = {};
    regs.forEach((r) => { if (r.college) colMap[r.college] = (colMap[r.college] || 0) + 1; });
    const colleges = Object.entries(colMap).sort((x, y) => y[1] - x[1]);
    const people = {};
    regs.concat(ds.champions).forEach((p) => (people[p.code] = p));

    return {
      upTo, total, visits, formStarts, shares, daily, visitsDaily, bars, cumulative, target, avg, projected, neededPerDay,
      bySource, referralRegs, peer, k, champions, referrers, colleges, people,
      inactive: champions.filter((x) => x.n === 0).length,
      ab: abTest(ds),
    };
  }

  /* ---------- KPIs ---------- */
  function renderKpis(a) {
    const conv = a.visits ? a.total / a.visits : 0;
    const cards = [
      { id: "regs", label: "Registrations", val: a.total, sub: `<b>${UI.pct(a.total / C.goal, 0)}</b> of the ${C.goal} goal`, spark: a.bars.slice(0, a.upTo), color: "#a99bff", progress: a.total / C.goal },
      { id: "visits", label: "Landing visits", val: a.visits, sub: `<b>${UI.fmt(a.formStarts)}</b> started the form`, spark: a.visitsDaily.slice(0, a.upTo), color: "#2fe3f0" },
      { id: "conv", label: "Visit → registration", val: conv * 100, dec: 1, suffix: "%", sub: `form completion <b>${UI.pct(a.formStarts ? Math.min(1, a.total / a.formStarts) : 0, 0)}</b>` },
      { id: "peer", label: "Peer-driven", val: a.total ? (a.peer / a.total) * 100 : 0, dec: 0, suffix: "%", sub: "via champions + friends' links" },
      { id: "k", label: "Viral k-factor", val: a.k, dec: 2, sub: `<b>${UI.fmt(a.referralRegs)}</b> joined via a friend` },
      { id: "cpr", label: "Cost / registration", val: a.total ? C.budget / a.total : 0, dec: 1, prefix: "₹", sub: `₹${UI.fmt(C.budget)} budget, all-in` },
    ];
    $("#kpis").innerHTML = cards.map((k) => `
      <div class="card kpi spotlight">
        <span class="kpi-label">${k.label}</span>
        <span class="kpi-val" data-kpi="${k.id}">0</span>
        <span class="kpi-sub">${k.sub}</span>
        ${k.progress != null ? `<div class="progress"><i style="--p:${Math.min(100, k.progress * 100).toFixed(1)}%"></i></div>` : ""}
        ${k.spark ? Charts.sparkline(k.spark.map((v) => v || 0), k.color) : ""}
      </div>`).join("");
    cards.forEach((k) => {
      UI.countUp($(`[data-kpi="${k.id}"]`), k.val, { from: prevKpi[k.id] || 0, decimals: k.dec || 0, prefix: k.prefix, suffix: k.suffix, duration: 1100 });
      prevKpi[k.id] = k.val;
    });
  }

  /* ---------- goal panel ---------- */
  function renderGoal(a) {
    Charts.ring($("#ring"), a.total / C.goal, { label: `${UI.fmt(a.total)} / ${C.goal}` });
    const done = a.upTo >= D;
    const facts = [
      [done ? "Final total" : `Projected by Day ${D}`, done ? UI.fmt(a.total) : `${UI.fmt(a.projected)} ${a.projected >= C.goal ? "✅" : "⚠️"}`],
      ["Needed per day", done ? (a.total >= C.goal ? "Goal hit 🎉" : "–") : a.neededPerDay ? `${a.neededPerDay}/day` : "Goal already hit 🎉"],
      ["Current pace (last 2 days)", `${Math.round(a.avg)}/day`],
      [`Expected live builders (${Math.round(C.showUpRate * 100)}%)`, `~${UI.fmt(a.total * C.showUpRate)}`],
      ["Budget used", `₹${UI.fmt(a.upTo >= 6 ? 600 : a.upTo >= 3 ? 300 : 0)} boost + ₹1,400 rewards`],
    ];
    $("#goal-facts").innerHTML = facts.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("");
  }

  /* ---------- channels ---------- */
  function renderChannels(a) {
    const rows = KEYS.filter((k) => CH[k].plan || a.bySource[k].regs || a.bySource[k].visits);
    const vsBadge = (r) => {
      const color = r >= 1 ? "var(--green)" : r >= 0.8 ? "var(--amber)" : "var(--red)";
      return `<span class="mini-bar"><i style="width:${Math.min(100, r * 100).toFixed(0)}%;background:${color}"></i></span><span class="vs" style="color:${color}">${UI.pct(r, 0)}</span>`;
    };
    let tv = 0, tr = 0, tp = 0;
    const body = rows.map((k) => {
      const s = a.bySource[k];
      const plan = Math.round((CH[k].plan * a.upTo) / D);
      tv += s.visits; tr += s.regs; tp += plan;
      return `<tr>
        <td><span class="ch-dot" style="background:${CH[k].color}"></span>${esc(CH[k].label)}</td>
        <td class="num">${UI.fmt(s.visits)}</td>
        <td class="num"><b>${UI.fmt(s.regs)}</b></td>
        <td class="num">${s.visits ? UI.pct(s.regs / s.visits, 1) : "–"}</td>
        <td class="num muted">${plan || "–"}</td>
        <td>${plan ? vsBadge(s.regs / plan) : '<span class="dim">–</span>'}</td>
      </tr>`;
    }).join("");
    $("#plan-note").textContent = `Plan pro-rated to Day ${a.upTo} of ${D} (see Growth Plan, slide 3)`;
    $("#channel-table").innerHTML = `
      <thead><tr><th>Channel</th><th class="num">Visits</th><th class="num">Regs</th><th class="num">Conv.</th><th class="num">Plan</th><th>vs plan</th></tr></thead>
      <tbody>${body}
        <tr><td><b>Total</b></td><td class="num"><b>${UI.fmt(tv)}</b></td><td class="num"><b>${UI.fmt(tr)}</b></td><td class="num"><b>${tv ? UI.pct(tr / tv, 1) : "–"}</b></td><td class="num muted">${tp}</td><td>${tp ? vsBadge(tr / tp) : ""}</td></tr>
      </tbody>`;

    Charts.donut($("#chart-mix"), KEYS.filter((k) => a.bySource[k].regs).map((k) => ({ label: CH[k].short, value: a.bySource[k].regs, color: CH[k].color })), { centerLabel: "registered" });
  }

  /* ---------- funnel ---------- */
  function renderFunnel(a) {
    Charts.funnel($("#chart-funnel"), [
      { label: "Visited landing page", value: a.visits, color: "#8f7dff" },
      { label: "Started the form", value: a.formStarts, color: "#5fb6f8" },
      { label: "Registered", value: a.total, color: "#2fe3f0" },
      { label: "Shared their link", value: a.shares, color: "#c3f75c" },
      { label: "Friends who joined", value: a.referralRegs, color: "#ffb547" },
    ]);
  }

  /* ---------- A/B ---------- */
  function renderAB(a) {
    const t = a.ab;
    const max = Math.max(t.pA, t.pB, 0.0001);
    const card = (k) => {
      const p = k === "A" ? t.pA : t.pB;
      const win = t.significant && t.winner === k;
      return `<div class="ab-var${win ? " win" : ""}">
        <div class="ab-top"><span class="badge ${k === "A" ? "badge-violet" : "badge-cyan"}">Variant ${k}${k === "A" ? " · control" : ""}</span>${win ? '<span class="badge badge-green">Winner</span>' : ""}</div>
        <div class="ab-headline">"${esc(HEADLINES[k])}"</div>
        <div class="hb-track"><div class="hb-fill" style="--w:${((p / max) * 100).toFixed(1)}%;--c:${k === "A" ? "#a99bff" : "#2fe3f0"}"></div></div>
        <div class="ab-stats"><span>Visits <b>${UI.fmt(t.v[k].visits)}</b></span><span>Registrations <b>${UI.fmt(t.v[k].regs)}</b></span><span>Conversion <b>${UI.pct(p, 1)}</b></span></div>
      </div>`;
    };
    const verdict = t.significant
      ? `<div class="ab-verdict">✅ <b>Variant ${t.winner} wins</b>: +${UI.pct(t.lift, 0)} relative lift, ${confText(t.pval)} confidence (z = ${Math.abs(t.z).toFixed(2)}). <b>Ship ${t.winner} to 100%</b> and test a Telugu-first headline next.</div>`
      : `<div class="ab-verdict neutral">⏳ Not conclusive yet (${confText(t.pval)} confidence, need 95% and 100+ visits per variant). Keep the 50/50 split running.</div>`;
    $("#ab").innerHTML = `<div class="ab-grid">${card("A")}${card("B")}${verdict}</div>`;
  }

  /* ---------- leaderboards ---------- */
  function renderTops(a) {
    const palette = ["#ffb547", "#a99bff", "#2fe3f0", "#c3f75c", "#ff5d8f", "#3ee6a0"];
    Charts.hbars($("#top-colleges"), a.colleges.slice(0, 6).map(([name, n], i) => ({ label: name, value: n, color: palette[i % palette.length] })));
    Charts.hbars($("#top-champs"), a.champions.slice(0, 5).filter((c) => c.n > 0).map((c) => ({
      html: UI.avatar(c.name) + `<span>${esc(Store.displayName(c.name))}</span>`,
      value: c.n, color: "#a99bff", sub: esc(c.college),
    })));
    if (a.inactive) $("#top-champs").insertAdjacentHTML("beforeend", `<p class="tiny c-amber mt-16">⚠️ ${a.inactive} of ${a.champions.length} champions have 0 signups</p>`);
    Charts.hbars($("#top-refs"), a.referrers.slice(0, 5).map((r) => ({
      html: UI.avatar(r.name) + `<span>${esc(Store.displayName(r.name))}</span>`,
      value: r.n, color: "#2fe3f0", sub: esc(r.college),
    })));
  }

  /* ---------- insights ---------- */
  function buildInsights(a) {
    const out = [];
    const short = (k) => CH[k].short;

    // 1. pace
    if (a.upTo < D) {
      if (a.projected >= C.goal) out.push({ tone: "good", icon: "🎯", title: `On track: projected ${UI.fmt(a.projected)} by Day ${D}`, body: `The last 2 days averaged ${Math.round(a.avg)}/day; ${a.neededPerDay}/day is enough to reach ${C.goal}.`, action: "Keep the current mix. Release the next ₹300 boost only if pace drops." });
      else out.push({ tone: "warn", icon: "⏱️", title: `Behind pace: projected ${UI.fmt(a.projected)} vs ${C.goal}`, body: `We need ${a.neededPerDay}/day for the remaining ${D - a.upTo} days; current pace is ${Math.round(a.avg)}/day.`, action: "Trigger Champion Wave 2 today and switch on the 2× referral bonus." });
    } else if (a.total >= C.goal) {
      out.push({ tone: "good", icon: "🏁", title: `Goal hit: ${UI.fmt(a.total)} registrations (${UI.pct(a.total / C.goal, 0)})`, body: `${UI.fmt(a.total - C.goal)} above goal, with ${UI.pct(a.total ? a.peer / a.total : 0, 0)} arriving through a peer.`, action: "Shift the team to show-up: reminders at T-24h, T-1h and T-10m." });
    } else {
      out.push({ tone: "warn", icon: "🏁", title: `Finished ${UI.fmt(C.goal - a.total)} short of the goal`, body: `${UI.fmt(a.total)} registered in ${D} days.`, action: "Run a 48-hour extension with a Wave 3 last call before the session." });
    }

    // 2. channel efficiency
    const eff = KEYS.filter((k) => a.bySource[k].visits >= 50).map((k) => ({ k, conv: a.bySource[k].regs / a.bySource[k].visits })).sort((x, y) => y.conv - x.conv);
    if (eff.length >= 2) {
      const best = eff[0], worst = eff[eff.length - 1];
      out.push({
        tone: "info", icon: "📊",
        title: `${short(best.k)}: ${(best.conv / Math.max(worst.conv, 0.0001)).toFixed(1)}× the conversion of ${short(worst.k)}`,
        body: `${UI.pct(best.conv)} vs ${UI.pct(worst.conv)} visit → registration.`,
        action: worst.k === "instagram" ? "Cap the remaining Instagram boost and move that ₹300 into champion rewards." : `Shift effort from ${short(worst.k)} to ${short(best.k)}.`,
      });
    }

    // 3. plan vs actual
    const pv = KEYS.filter((k) => CH[k].plan).map((k) => {
      const plan = (CH[k].plan * a.upTo) / D;
      return { k, plan, act: a.bySource[k].regs, r: plan ? a.bySource[k].regs / plan : 0 };
    }).filter((x) => x.plan >= 8).sort((x, y) => x.r - y.r);
    if (pv.length) {
      const under = pv[0], over = pv[pv.length - 1];
      if (under.r < 0.95) out.push({
        tone: "warn", icon: "📉",
        title: `${short(under.k)} at ${UI.pct(under.r, 0)} of plan`,
        body: `${UI.fmt(under.act)} vs ${Math.round(under.plan)} planned by Day ${a.upTo}.`,
        action: under.k === "whatsapp" ? `Nudge the ${a.inactive} silent champions and recruit 10 more in colleges with < 5 signups.` : `Re-send to ${short(under.k)} with the social-proof message.`,
      });
      if (over.r > 1.05) out.push({
        tone: "good", icon: "🚀",
        title: `${short(over.k)} at ${UI.pct(over.r, 0)} of plan`,
        body: `${UI.fmt(over.act)} vs ${Math.round(over.plan)} planned. This channel is outperforming.`,
        action: over.k === "referral" ? "Extend the 2× referral bonus to Day 7 and shout out the top referrers." : `Double down: repeat the winning message on ${short(over.k)}.`,
      });
    }

    // 4. form drop-off
    if (a.formStarts >= 30) {
      const drop = 1 - a.total / a.formStarts;
      if (drop > 0.25) out.push({ tone: "warn", icon: "🧾", title: `${UI.pct(drop, 0)} abandon the registration form`, body: `${UI.fmt(a.formStarts - a.total)} students started but didn't finish.`, action: "College is pre-filled from champion links (shipped). Next: test dropping the graduation-year field." });
      else out.push({ tone: "good", icon: "🧾", title: `Form completion is healthy (${UI.pct(1 - drop, 0)})`, body: "6 fields, mobile-first, one screen.", action: "Leave the form alone. Focus on traffic." });
    }

    // 5. A/B
    const t = a.ab;
    if (t.significant) out.push({ tone: "good", icon: "🧪", title: `Headline ${t.winner} wins: +${UI.pct(t.lift, 0)} conversion`, body: `"${HEADLINES[t.winner]}" at ${confText(t.pval)} confidence.`, action: `Ship variant ${t.winner} to 100% and start testing a Telugu-first headline.` });
    else if (t.v.A.visits + t.v.B.visits > 60) out.push({ tone: "info", icon: "🧪", title: "Headline test not conclusive yet", body: `${confText(t.pval)} confidence so far.`, action: "Keep the 50/50 split running. Don't call it early." });

    // 6. referral loop
    if (a.total >= 20) {
      if (a.k >= 0.25) out.push({ tone: "good", icon: "🔁", title: `Referral loop is compounding (k = ${a.k.toFixed(2)})`, body: `Every 100 non-referral signups bring ${Math.round(a.k * 100)} more for free.`, action: "Send the \"1 friend away from your Prompt Pack\" WhatsApp nudge." });
      else out.push({ tone: "warn", icon: "🔁", title: `Referral loop is weak (k = ${a.k.toFixed(2)})`, body: `Only ${UI.pct(a.total ? a.shares / a.total : 0, 0)} of registrants shared their link.`, action: "Make sharing louder: 2× bonus + leaderboard screenshot in Wave 2." });
    }

    // 7. concentration
    if (a.colleges.length >= 4 && a.total) {
      const top3 = a.colleges.slice(0, 3);
      const share = sum(top3.map((c) => c[1])) / a.total;
      const thin = C.colleges.filter((name) => (a.colleges.find((c) => c[0] === name) || [0, 0])[1] < 5).length;
      out.push({ tone: share > 0.35 ? "warn" : "info", icon: "🏫", title: `Top 3 colleges = ${UI.pct(share, 0)} of signups`, body: top3.map((c) => `${c[0]} (${c[1]})`).join(" · "), action: thin ? `Recruit champions in the ${thin} target colleges with fewer than 5 signups.` : "Coverage is broad. Keep the college battle going." });
    }

    // 8. show-up
    out.push({ tone: "info", icon: "📅", title: `Expect ~${UI.fmt(a.total * C.showUpRate)} live builders at ${Math.round(C.showUpRate * 100)}% show-up`, body: "Registrations are half the job. Attendance decides if the workshop works.", action: "Calendar invite at signup (shipped) + WhatsApp reminders at T-24h, T-1h, T-10m." });

    return out;
  }

  function renderInsights(a) {
    const list = buildInsights(a);
    $("#insights").innerHTML = list.length ? list.map((i, n) => `
      <article class="insight ${i.tone}" style="animation-delay:${n * 60}ms">
        <span class="i-icon">${i.icon}</span>
        <h3>${esc(i.title)}</h3>
        <p>${esc(i.body)}</p>
        <span class="do">→ ${esc(i.action)}</span>
      </article>`).join("") : `<div class="empty">Insights appear once data starts flowing.</div>`;
  }

  /* ---------- recent ---------- */
  function renderRecent(ds, a) {
    const list = ds.registrations.slice().sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt)).slice(0, 10);
    if (!list.length) { $("#recent").innerHTML = `<tbody><tr><td><div class="empty">No registrations yet.</div></td></tr></tbody>`; return; }
    $("#recent").innerHTML = `
      <thead><tr><th>When</th><th>Student</th><th>College</th><th>Channel</th><th>Referred by</th><th>Variant</th></tr></thead>
      <tbody>${list.map((r) => {
        const ch = CH[chKey(r.source)];
        const by = r.referredBy ? a.people[r.referredBy] : null;
        return `<tr>
          <td class="muted mono small">D${r.day} · ${UI.dateFmt(r.createdAt, { hour: "numeric", minute: "2-digit", hour12: true })}${r.live ? ' <span class="badge badge-lime">you</span>' : ""}</td>
          <td><div class="who">${UI.avatar(r.name)}<span>${esc(Store.displayName(r.name))}</span></div></td>
          <td class="muted">${esc(r.college)}</td>
          <td><span class="ch-dot" style="background:${ch.color}"></span>${esc(ch.short)}</td>
          <td class="muted">${by ? esc(Store.displayName(by.name)) : r.referredBy ? `<span class="mono">${esc(r.referredBy)}</span>` : "–"}</td>
          <td><span class="badge ${r.variant === "B" ? "badge-cyan" : "badge-violet"}">${esc(r.variant || "–")}</span></td>
        </tr>`;
      }).join("")}</tbody>`;
  }

  /* ---------- status + empty state ---------- */
  function renderStatus(ds) {
    const liveN = ds.registrations.filter((r) => r.live).length;
    const src = ds.remote ? "Google Sheets backend" : "this browser";
    $("#data-status").innerHTML = mode === "demo"
      ? `Data: seeded 7-day simulation + <b>${liveN}</b> live registration${liveN === 1 ? "" : "s"} from ${src}`
      : `Data: <b>live only</b> · ${liveN} registration${liveN === 1 ? "" : "s"} from ${src}`;
    $("#live-empty").innerHTML = mode === "live" && !ds.registrations.length
      ? `<div class="card live-empty"><div class="empty"><span class="e-icon">📭</span><b>No live data yet.</b>Register on the <a class="c-cyan" href="index.html#register">landing page</a> (try a few with different <span class="mono">?utm_source=</span> values), or connect the Google Sheets backend. This view fills up in real time.</div></div>`
      : "";
  }

  /* ---------- render ---------- */
  function renderCombo(a, animateFrom) {
    Charts.combo($("#chart-daily"), {
      labels: Array.from({ length: D }, (_, i) => C.dayLabel(i + 1)),
      bars: a.bars, cumulative: a.cumulative, target: a.target, goal: C.goal,
      animateFrom,
    });
  }

  function render(opts) {
    opts = opts || {};
    return Store.getDataset({ demo: mode === "demo", upToDay: day, force: opts.force }).then((ds) => {
      const a = analyze(ds);
      lastDS = ds; lastA = a;
      $("#day-now").textContent = day;
      $("#day-label").textContent = `Day ${day} · ${C.dayLabel(day)}`;
      renderStatus(ds);
      renderKpis(a);
      const animateFrom = lastDay == null ? 0 : day > lastDay ? lastDay : D;
      renderCombo(a, animateFrom);
      lastDay = day;
      renderGoal(a);
      renderChannels(a);
      renderFunnel(a);
      renderAB(a);
      renderTops(a);
      renderInsights(a);
      renderRecent(ds, a);
    });
  }

  /* ---------- controls ---------- */
  const range = $("#day-range");
  range.max = String(D);
  range.addEventListener("input", () => { day = Number(range.value); render(); });

  $$("[data-mode]").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.mode === mode));
    b.addEventListener("click", () => {
      mode = b.dataset.mode;
      $$("[data-mode]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      lastDay = null;
      render();
    });
  });

  const playBtn = $("#play");
  playBtn.addEventListener("click", async () => {
    if (playing) { playing = false; return; }
    playing = true;
    playBtn.textContent = "❚❚";
    playBtn.setAttribute("aria-label", "Pause replay");
    lastDay = 0;
    for (let d = 1; d <= D && playing; d++) {
      day = d;
      range.value = d;
      await render();
      await sleep(1300);
    }
    playing = false;
    playBtn.textContent = "▶";
    playBtn.setAttribute("aria-label", "Replay the 7-day campaign");
  });

  $("#export").addEventListener("click", () => {
    if (!lastDS) return;
    const cols = ["createdAt", "day", "name", "college", "branch", "gradYear", "code", "referredBy", "source", "medium", "variant", "dataset"];
    const cell = (v) => {
      let s = v == null ? "" : String(v);
      if (/^[=+\-@]/.test(s)) s = "'" + s; // spreadsheet formula-injection guard
      return `"${s.replace(/"/g, '""')}"`;
    };
    const rows = lastDS.registrations.map((r) => cols.map((c) => cell(c === "dataset" ? (r.demo ? "simulated" : "live") : r[c])).join(","));
    const blob = new Blob(["﻿" + cols.join(",") + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `buildai60-registrations-day${day}-${mode}.csv`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 500);
    UI.toast(`Exported ${rows.length} registrations`, "ok", "⬇");
  });

  $("#reset").addEventListener("click", () => {
    if (!window.confirm("Clear the test registrations, champions and events stored in this browser? Simulated data is not affected.")) return;
    Store.clearLocal();
    UI.toast("Your local test data was cleared", "ok", "🧹");
    render({ force: true });
  });

  let rt;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => { if (lastA) renderCombo(lastA, D); }, 150);
  });

  render();
})();

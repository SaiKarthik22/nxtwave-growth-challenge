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
    B: "Ship your first AI app before placement season.",
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
      { id: "regs", label: "Seats booked", val: a.total, sub: `Aim: ${C.goal} · <b>${UI.pct(a.total / C.goal, 0)}</b> done`, spark: a.bars.slice(0, a.upTo), color: "#6f6cf2", progress: a.total / C.goal },
      { id: "visits", label: "Page visits", val: a.visits, sub: `<b>${UI.fmt(a.formStarts)}</b> began filling the form`, spark: a.visitsDaily.slice(0, a.upTo), color: "#0b8a7e" },
      { id: "conv", label: "Visit to sign-up", val: conv * 100, dec: 1, suffix: "%", sub: `<b>${UI.pct(a.formStarts ? Math.min(1, a.total / a.formStarts) : 0, 0)}</b> of form starters finish` },
      { id: "peer", label: "Came via a peer", val: a.total ? (a.peer / a.total) * 100 : 0, dec: 0, suffix: "%", sub: "through a champion's or a friend's link" },
      { id: "k", label: "Referral k-factor", val: a.k, dec: 2, sub: `<b>${UI.fmt(a.referralRegs)}</b> signed up from a friend's invite` },
      { id: "cpr", label: "Spend per sign-up", val: a.total ? C.budget / a.total : 0, dec: 1, prefix: "₹", sub: `whole ₹${UI.fmt(C.budget)} budget counted` },
    ];
    $("#kpis").innerHTML = cards.map((k) => `
      <div class="card kpi card-hover spotlight">
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
      [done ? "Where we ended" : `Day ${D} forecast`, done ? UI.fmt(a.total) : `${UI.fmt(a.projected)} ${a.projected >= C.goal ? "✅" : "⚠️"}`],
      ["Still needed each day", done ? (a.total >= C.goal ? "None, target met 🎉" : "–") : a.neededPerDay ? `${a.neededPerDay} a day` : "None, already there 🎉"],
      ["Recent pace (2-day avg)", `${Math.round(a.avg)} a day`],
      [`Likely to attend (${Math.round(C.showUpRate * 100)}%)`, `about ${UI.fmt(a.total * C.showUpRate)}`],
      ["Spent so far", `₹${UI.fmt(a.upTo >= 6 ? 600 : a.upTo >= 3 ? 300 : 0)} boost · ₹1,400 prizes`],
    ];
    $("#goal-facts").innerHTML = facts.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("");
  }

  /* ---------- channels ---------- */
  function renderChannels(a) {
    const rows = KEYS.filter((k) => CH[k].plan || a.bySource[k].regs || a.bySource[k].visits);
    const vsBadge = (r) => {
      const color = r >= 1 ? "var(--green)" : r >= 0.8 ? "var(--amber)" : "var(--red)";
      const fill = r >= 0.8 && r < 1 ? "var(--amber-fill)" : color;
      return `<span class="mini-bar"><i style="width:${Math.min(100, r * 100).toFixed(0)}%;background:${fill}"></i></span><span class="vs" style="color:${color}">${UI.pct(r, 0)}</span>`;
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
    $("#plan-note").textContent = a.upTo < D
      ? `Targets are scaled down to Day ${a.upTo} of ${D}, so each channel is judged only on the days so far`
      : `Full ${D}-day targets, set in the campaign plan`;
    $("#channel-table").innerHTML = `
      <thead><tr><th>Source</th><th class="num">Visits</th><th class="num">Joined</th><th class="num">Rate</th><th class="num">Target</th><th>Of target</th></tr></thead>
      <tbody>${body}
        <tr><td><b>All channels</b></td><td class="num"><b>${UI.fmt(tv)}</b></td><td class="num"><b>${UI.fmt(tr)}</b></td><td class="num"><b>${tv ? UI.pct(tr / tv, 1) : "–"}</b></td><td class="num muted">${tp}</td><td>${tp ? vsBadge(tr / tp) : ""}</td></tr>
      </tbody>`;

    Charts.donut($("#chart-mix"), KEYS.filter((k) => a.bySource[k].regs).map((k) => ({ label: CH[k].short, value: a.bySource[k].regs, color: CH[k].color })), { centerLabel: "sign-ups", aria: "Share of sign-ups by channel" });
  }

  /* ---------- funnel ---------- */
  function renderFunnel(a) {
    Charts.funnel($("#chart-funnel"), [
      { label: "Opened the Workshop page", value: a.visits, color: "#3d3bd9" },
      { label: "Typed into the form", value: a.formStarts, color: "#6f6cf2" },
      { label: "Booked a seat", value: a.total, color: "#0b8a7e" },
      { label: "Sent their invite link", value: a.shares, color: "#ff6b4a" },
      { label: "Friends who signed up", value: a.referralRegs, color: "#ffb020" },
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
        <div class="ab-top"><span class="badge ${k === "A" ? "badge-indigo" : "badge-teal"}">Headline ${k} · ${k === "A" ? "original" : "challenger"}</span>${win ? '<span class="badge badge-green">Proven better</span>' : ""}</div>
        <div class="ab-headline">"${esc(HEADLINES[k])}"</div>
        <div class="hb-track"><div class="hb-fill" style="--w:${((p / max) * 100).toFixed(1)}%;--c:${k === "A" ? "#3d3bd9" : "#0b8a7e"}"></div></div>
        <div class="ab-stats"><span>Seen by <b>${UI.fmt(t.v[k].visits)}</b></span><span>Signed up <b>${UI.fmt(t.v[k].regs)}</b></span><span>Rate <b>${UI.pct(p, 1)}</b></span></div>
      </div>`;
    };
    const verdict = t.significant
      ? `<div class="ab-verdict">✅ <b>Headline ${t.winner} pulls ahead.</b> It converts ${UI.pct(t.lift, 0)} better in relative terms, at ${confText(t.pval)} confidence (z = ${Math.abs(t.z).toFixed(2)}). <b>Give ${t.winner} all the traffic</b>, then line up a Telugu-first headline as the next challenger.</div>`
      : `<div class="ab-verdict neutral">⏳ <b>Too early to call.</b> Confidence is ${confText(t.pval)}, and we wait for 95% with at least 100 visits on each side. Leave the split at 50/50 until then.</div>`;
    $("#ab").innerHTML = `<div class="ab-grid">${card("A")}${card("B")}${verdict}</div>`;
  }

  /* ---------- leaderboards ---------- */
  function renderTops(a) {
    Charts.hbars($("#top-colleges"), a.colleges.slice(0, 6).map(([name, n]) => ({ label: name, value: n, color: "#0b8a7e" })));
    Charts.hbars($("#top-champs"), a.champions.slice(0, 5).filter((c) => c.n > 0).map((c) => ({
      html: UI.avatar(c.name) + `<span>${esc(Store.displayName(c.name))}</span>`,
      value: c.n, color: "#6f6cf2", sub: esc(c.college),
    })));
    if (a.inactive) $("#top-champs").insertAdjacentHTML("beforeend", `<p class="tiny c-amber mt-16 champ-note">⚠️ ${a.inactive} of ${a.champions.length} champions are still at zero sign-ups</p>`);
    Charts.hbars($("#top-refs"), a.referrers.slice(0, 5).map((r) => ({
      html: UI.avatar(r.name) + `<span>${esc(Store.displayName(r.name))}</span>`,
      value: r.n, color: "#ff6b4a", sub: esc(r.college),
    })));
  }

  /* ---------- insights ---------- */
  function buildInsights(a) {
    const out = [];
    const short = (k) => CH[k].short;

    // 1. pace
    if (a.upTo < D) {
      const left = D - a.upTo;
      if (a.projected >= C.goal) out.push({ tone: "good", icon: "🎯", title: `Heading for ${UI.fmt(a.projected)} by Day ${D}`, body: `The last two days brought in ${Math.round(a.avg)} a day. ${a.neededPerDay ? `Keeping ${a.neededPerDay} a day from here is enough for ${C.goal}.` : `${C.goal} is already covered.`}`, action: "Hold the channel mix as it is. Keep the next ₹300 boost in reserve unless the daily count dips." });
      else out.push({ tone: "warn", icon: "⏱️", title: `Short of pace: forecast ${UI.fmt(a.projected)}, target ${C.goal}`, body: `The last two days gave ${Math.round(a.avg)} a day, and the ${left} day${left === 1 ? "" : "s"} left need ${a.neededPerDay} each.`, action: "Send Champion Wave 2 out today and turn on the double referral bonus." });
    } else if (a.total >= C.goal) {
      out.push({ tone: "good", icon: "🏁", title: `Target cleared with ${UI.fmt(a.total)} sign-ups (${UI.pct(a.total / C.goal, 0)})`, body: `${UI.fmt(a.total - C.goal)} more than we aimed for, and ${UI.pct(a.total ? a.peer / a.total : 0, 0)} came through someone they know.`, action: "Move the whole team onto attendance: reminders 24 hours, 1 hour and 10 minutes before we go live." });
    } else {
      out.push({ tone: "warn", icon: "🏁", title: `Closed ${UI.fmt(C.goal - a.total)} below the target`, body: `${UI.fmt(a.total)} sign-ups across the ${D} days.`, action: "Open a 48-hour extension and send a Wave 3 final call before the session starts." });
    }

    // 2. channel efficiency
    const eff = KEYS.filter((k) => a.bySource[k].visits >= 50).map((k) => ({ k, conv: a.bySource[k].regs / a.bySource[k].visits })).sort((x, y) => y.conv - x.conv);
    if (eff.length >= 2) {
      const best = eff[0], worst = eff[eff.length - 1];
      out.push({
        tone: "info", icon: "⚖️",
        title: `${(best.conv / Math.max(worst.conv, 0.0001)).toFixed(1)}× the sign-up rate: ${short(best.k)} vs ${short(worst.k)}`,
        body: `Visits that end in a sign-up: ${UI.pct(best.conv)} on ${short(best.k)}, ${UI.pct(worst.conv)} on ${short(worst.k)}.`,
        action: worst.k === "instagram" ? "Stop the rest of the Instagram boost and put that ₹300 into champion prizes." : `Move time and posts from ${short(worst.k)} over to ${short(best.k)}.`,
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
        title: `${short(under.k)}: ${UI.pct(under.r, 0)} of target so far`,
        body: `${UI.fmt(under.act)} sign-ups so far, against ${Math.round(under.plan)} expected by Day ${a.upTo}.`,
        action: under.k === "whatsapp" ? `Ping the ${a.inactive} quiet champions, and sign up 10 new ones at colleges still under 5 sign-ups.` : `Message ${short(under.k)} again, this time leading with how many classmates have already joined.`,
      });
      if (over.r > 1.05) out.push({
        tone: "good", icon: "🚀",
        title: `${short(over.k)}: ${UI.pct(over.r, 0)} of target and climbing`,
        body: `${UI.fmt(over.act)} sign-ups against ${Math.round(over.plan)} expected, ahead of schedule.`,
        action: over.k === "referral" ? "Keep the double referral bonus on through Day 7 and thank the top referrers by name." : `Post the same message on ${short(over.k)} again while it is still working.`,
      });
    }

    // 4. form drop-off
    if (a.formStarts >= 30) {
      const drop = 1 - a.total / a.formStarts;
      if (drop > 0.25) out.push({ tone: "warn", icon: "📝", title: `${UI.pct(drop, 0)} leave the form half-filled`, body: `${UI.fmt(a.formStarts - a.total)} students began registering and stopped before submitting.`, action: "Champion links already fill in the college. Next test: remove the graduation-year question." });
      else out.push({ tone: "good", icon: "📝", title: `${UI.pct(1 - drop, 0)} of form starters finish`, body: "Six fields on one mobile screen are doing their job.", action: "No form changes needed. Spend the effort on bringing in more visitors." });
    }

    // 5. A/B
    const t = a.ab;
    if (t.significant) out.push({ tone: "good", icon: "🧪", title: `Headline ${t.winner} converts ${UI.pct(t.lift, 0)} better`, body: `"${HEADLINES[t.winner]}" leads at ${confText(t.pval)} confidence.`, action: `Send all traffic to headline ${t.winner}, then try a Telugu-first version against it.` });
    else if (t.v.A.visits + t.v.B.visits > 60) out.push({ tone: "info", icon: "🧪", title: "Headline test is still undecided", body: `Confidence sits at ${confText(t.pval)} so far.`, action: "Leave the 50/50 split alone and wait for 95% before picking a side." });

    // 6. referral loop
    if (a.total >= 20) {
      if (a.k >= 0.25) out.push({ tone: "good", icon: "🤝", title: `Referrals are snowballing (k = ${a.k.toFixed(2)})`, body: `Each 100 sign-ups from other channels pull in ${Math.round(a.k * 100)} more through friends, at no extra cost.`, action: "Send the \"one more friend unlocks your AI Prompt Pack\" reminder on WhatsApp." });
      else out.push({ tone: "warn", icon: "🤝", title: `Referrals are slow to spread (k = ${a.k.toFixed(2)})`, body: `Just ${UI.pct(a.total ? a.shares / a.total : 0, 0)} of registered students have passed their link on.`, action: "Push sharing harder in Wave 2: announce the double bonus and post a leaderboard screenshot." });
    }

    // 7. concentration
    if (a.colleges.length >= 4 && a.total) {
      const top3 = a.colleges.slice(0, 3);
      const share = sum(top3.map((c) => c[1])) / a.total;
      const thin = C.colleges.filter((name) => (a.colleges.find((c) => c[0] === name) || [0, 0])[1] < 5).length;
      out.push({ tone: share > 0.35 ? "warn" : "info", icon: "🏫", title: `${UI.pct(share, 0)} of sign-ups come from just 3 colleges`, body: top3.map((c) => `${c[0]} (${c[1]})`).join(" · "), action: thin ? `Find champions for the ${thin} target colleges still under 5 sign-ups.` : "Sign-ups are spread well, so keep the College Battle running." });
    }

    // 8. show-up
    out.push({ tone: "info", icon: "🔔", title: `About ${UI.fmt(a.total * C.showUpRate)} students should join live (${Math.round(C.showUpRate * 100)}% show-up)`, body: "A booked seat counts for little if the student never logs in on Sunday evening.", action: "Signup already sends a calendar invite. Add WhatsApp reminders 24 hours, 1 hour and 10 minutes before the start." });

    return out;
  }

  const TONES = {
    good: { label: "Good news", badge: "badge-green" },
    warn: { label: "Act on this", badge: "badge-amber" },
    info: { label: "For context", badge: "badge-indigo" },
  };

  function renderInsights(a) {
    const list = buildInsights(a);
    $("#insights").innerHTML = list.length ? list.map((i, n) => `
      <article class="insight ${i.tone}" style="animation-delay:${n * 60}ms">
        <div class="i-top"><span class="i-icon" aria-hidden="true">${i.icon}</span><span class="badge ${TONES[i.tone].badge} i-tone">${TONES[i.tone].label}</span></div>
        <h3>${esc(i.title)}</h3>
        <p>${esc(i.body)}</p>
        <p class="do"><span>What we do</span>${esc(i.action)}</p>
      </article>`).join("") : `<div class="empty">Once a few sign-ups come in, the rules will have something to say.</div>`;
  }

  /* ---------- recent ---------- */
  function renderRecent(ds, a) {
    const list = ds.registrations.slice().sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt)).slice(0, 10);
    if (!list.length) { $("#recent").innerHTML = `<tbody><tr><td><div class="empty">The table is empty for now. The next person to register appears at the top.</div></td></tr></tbody>`; return; }
    $("#recent").innerHTML = `
      <thead><tr><th>Time</th><th>Name</th><th>College</th><th>Came from</th><th>Invited by</th><th>Headline</th></tr></thead>
      <tbody>${list.map((r) => {
        const ch = CH[chKey(r.source)];
        const by = r.referredBy ? a.people[r.referredBy] : null;
        return `<tr>
          <td class="muted mono small">D${r.day} · ${UI.dateFmt(r.createdAt, { hour: "numeric", minute: "2-digit", hour12: true })}${r.live ? ' <span class="badge badge-green live-tag"><span class="dot-live"></span>live</span>' : ""}</td>
          <td><div class="who">${UI.avatar(r.name)}<span>${esc(Store.displayName(r.name))}</span></div></td>
          <td class="muted">${esc(r.college)}</td>
          <td><span class="ch-dot" style="background:${ch.color}"></span>${esc(ch.short)}</td>
          <td class="muted">${by ? esc(Store.displayName(by.name)) : r.referredBy ? `<span class="mono">${esc(r.referredBy)}</span>` : "–"}</td>
          <td><span class="badge ${r.variant === "B" ? "badge-teal" : "badge-indigo"}">${esc(r.variant || "–")}</span></td>
        </tr>`;
      }).join("")}</tbody>`;
  }

  /* ---------- status + empty state ---------- */
  function renderStatus(ds) {
    const liveN = ds.registrations.filter((r) => r.live).length;
    const src = ds.remote ? "from the Google Sheets backend" : "saved in this browser";
    const tail = `real sign-up${liveN === 1 ? "" : "s"} ${src}`;
    $("#data-status").classList.toggle("is-live", mode === "live");
    $("#data-status").innerHTML = mode === "demo"
      ? `Showing the simulated 7-day run, plus <b>${liveN}</b> ${tail}`
      : `Showing <b>live data only</b>: ${liveN} ${tail}`;
    $("#live-empty").innerHTML = mode === "live" && !ds.registrations.length
      ? `<div class="card live-empty"><div class="empty"><span class="e-icon">🌱</span><b>Nothing live to show yet.</b>Register yourself on the <a class="c-indigo" href="index.html#register">Workshop page</a>, ideally a few times with different <span class="mono">?utm_source=</span> tags, or hook up the Google Sheets backend. Each real sign-up appears here as soon as it is saved.</div></div>`
      : "";
  }

  /* ---------- render ---------- */
  // When the goal panel sits beside the chart, grow the chart to fill the shared row
  // (measured from the goal panel's content, so a stretched row never feeds back into it).
  function comboHeight() {
    const el = $("#chart-daily"), panel = el.parentElement, goal = $(".goal-panel");
    if (!goal || !goal.lastElementChild || goal.offsetTop !== panel.offsetTop) return 290;
    const pad = (n) => parseFloat(getComputedStyle(n).paddingBottom) || 0;
    const last = goal.lastElementChild;
    const free = last.offsetTop + last.offsetHeight + pad(goal) - el.offsetTop - pad(panel);
    return Math.round(Math.min(420, Math.max(290, free)));
  }

  function renderCombo(a, animateFrom) {
    Charts.combo($("#chart-daily"), {
      labels: Array.from({ length: D }, (_, i) => C.dayLabel(i + 1)),
      bars: a.bars, cumulative: a.cumulative, target: a.target, goal: C.goal,
      animateFrom, height: comboHeight(),
    });
  }

  function render(opts) {
    opts = opts || {};
    return Store.getDataset({ demo: mode === "demo", upToDay: day, force: opts.force }).then((ds) => {
      const a = analyze(ds);
      lastDS = ds; lastA = a;
      $("#day-now").textContent = day;
      syncRange();
      $("#day-label").textContent = `Day ${day} · ${C.dayLabel(day)}`;
      renderStatus(ds);
      renderKpis(a);
      const animateFrom = lastDay == null ? 0 : day > lastDay ? lastDay : D;
      renderGoal(a); // first, so the chart can match the goal panel's height
      renderCombo(a, animateFrom);
      lastDay = day;
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
  // the filled part of the custom range track follows the thumb (--p = 0..1)
  function syncRange() { range.style.setProperty("--p", D > 1 ? ((Number(range.value) - 1) / (D - 1)).toFixed(3) : "1"); }
  range.addEventListener("input", () => { day = Number(range.value); syncRange(); render(); });

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
    playBtn.setAttribute("aria-label", "Stop the playback");
    lastDay = 0;
    for (let d = 1; d <= D && playing; d++) {
      day = d;
      range.value = d;
      await render();
      await sleep(1300);
    }
    playing = false;
    playBtn.textContent = "▶";
    playBtn.setAttribute("aria-label", "Play the 7 days back, one day at a time");
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
    UI.toast(`Saved ${rows.length} sign-ups to a CSV file`, "ok", "⬇");
  });

  $("#reset").addEventListener("click", () => {
    if (!window.confirm("Delete the test sign-ups, champions and events saved in this browser? The simulated campaign stays as it is.")) return;
    Store.clearLocal();
    UI.toast("Test data removed from this browser", "ok", "🧹");
    render({ force: true });
  });

  let rt;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => { if (lastA) renderCombo(lastA, D); }, 150);
  });

  render();
})();

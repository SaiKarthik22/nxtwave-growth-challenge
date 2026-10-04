/* =========================================================
   BuildAI·60 — Referral Hub
   Stats lookup, leaderboards (referrers / champions / colleges)
   and the Campus Champion kit: tracking link, QR poster,
   3-wave WhatsApp scripts in English + Telugu.
   ========================================================= */
(function () {
  "use strict";
  const C = window.CONFIG;
  const $ = UI.$, $$ = UI.$$, esc = UI.esc;
  let DS = null, X = null;

  $("#prize-line").textContent = `${C.topReferrerPrize}. ${C.championPrize}.`;
  $("#champ-prize").textContent = "🎁 Top-5 voucher pool (₹1,000)";
  $("#c-college-list").innerHTML = C.colleges.map((c) => `<option value="${esc(c)}"></option>`).join("");

  /* ---------- data ---------- */
  function compute(ds) {
    const counts = Store.referralCounts(ds.registrations);
    const byAge = (a, b) => new Date(a.createdAt) - new Date(b.createdAt);
    const referrers = ds.registrations
      .filter((r) => counts[r.code])
      .map((r) => Object.assign({}, r, { n: counts[r.code] }))
      .sort((a, b) => b.n - a.n || byAge(a, b));
    const champions = ds.champions
      .map((c) => Object.assign({}, c, { n: counts[c.code] || 0 }))
      .sort((a, b) => b.n - a.n || byAge(a, b));
    const colleges = {};
    const bump = (name) => (colleges[name] = colleges[name] || { name, n: 0, champs: 0 });
    ds.registrations.forEach((r) => { if (r.college) bump(r.college).n++; });
    ds.champions.forEach((c) => { if (c.college) bump(c.college).champs++; });
    const battle = Object.values(colleges).sort((a, b) => b.n - a.n);
    return { counts, referrers, champions, battle };
  }

  function load(force) {
    return Store.getDataset({ upToDay: C.demoDay, force }).then((ds) => {
      DS = ds;
      X = compute(ds);
      renderHero();
      renderBoards();
      return ds;
    });
  }

  const mine = () => [Store.myCode(), Store.myChampionCode()].filter(Boolean);
  const myCollege = () => ((Store.myRegistration() || Store.myChampion() || {}).college || "");

  /* ---------- hero stats ---------- */
  function renderHero() {
    const total = DS.registrations.length;
    const peer = total ? DS.registrations.filter((r) => r.referredBy).length / total : 0;
    UI.countUp($("#hs-total"), total);
    UI.countUp($("#hs-colleges"), X.battle.filter((b) => b.n > 0).length);
    $("#hs-champs").textContent = `${X.champions.filter((c) => c.n > 0).length}/${X.champions.length}`;
    UI.countUp($("#hs-peer"), Math.round(peer * 100), { suffix: "%" });
  }

  /* ---------- leaderboards ---------- */
  const MEDALS = ["🥇", "🥈", "🥉"];
  function podium(list, unit) {
    const top = list.slice(0, 3);
    if (!top.length) return "";
    const order = top.length === 3 ? [top[1], top[0], top[2]] : top;
    const me = mine();
    return `<div class="podium">${order.map((p) => {
      const place = top.indexOf(p) + 1;
      return `<div class="pod pod-${place}${me.includes(p.code) ? " me" : ""}" style="animation-delay:${place * 90}ms">
        <span class="pod-medal">${MEDALS[place - 1]}</span>
        ${UI.avatar(p.name)}
        <b>${esc(Store.displayName(p.name))}</b>
        <span class="pod-col">${esc(p.college)}</span>
        <span class="pod-n">${p.n}<small>${unit}</small></span>
      </div>`;
    }).join("")}</div>`;
  }

  function rewardFor(n, rank) {
    const tier = C.rewards.slice().reverse().find((t) => n >= t.at);
    const prize = rank <= 4 ? ` <span class="badge badge-amber">₹100 recharge</span>` : "";
    return (tier ? `${tier.icon} ${esc(tier.title)}` : `<span class="dim">—</span>`) + prize;
  }

  function withMyRow(list, limit) {
    const rows = list.slice(0, limit).map((p, i) => ({ p, rank: i + 1 }));
    mine().forEach((code) => {
      const i = list.findIndex((p) => p.code === code);
      if (i >= limit) rows.push({ p: list[i], rank: i + 1, gap: true });
    });
    return rows;
  }

  function emptyState(icon, html) { return `<div class="empty"><span class="e-icon">${icon}</span>${html}</div>`; }

  function renderReferrers() {
    const panel = $("#panel-ref");
    if (!X.referrers.length) {
      panel.innerHTML = emptyState("🚀", `No referrals yet. <a class="c-cyan" href="index.html#register">Register</a>, share your link and take #1.`);
      return;
    }
    const me = mine();
    const rows = withMyRow(X.referrers, 15).filter((r) => r.rank > 3 || r.gap);
    panel.innerHTML = podium(X.referrers, "friends") + (rows.length ? `
      <div class="card lb-card"><div class="table-wrap"><table class="table lb-table">
        <thead><tr><th>Rank</th><th>Student</th><th>College</th><th class="num">Friends</th><th>Reward</th></tr></thead>
        <tbody>${rows.map(({ p, rank }) => `
          <tr class="${me.includes(p.code) ? "me" : ""}">
            <td class="rank">#${rank}</td>
            <td><div class="who">${UI.avatar(p.name)}<span>${esc(Store.displayName(p.name))}${me.includes(p.code) ? " (you)" : ""}</span></div></td>
            <td class="muted">${esc(p.college)}</td>
            <td class="num n">${p.n}</td>
            <td>${rewardFor(p.n, rank)}</td>
          </tr>`).join("")}</tbody>
      </table></div></div>` : "");
  }

  function champStatus(c, rank) {
    if (rank <= 5 && c.n > 0) return `<span class="badge badge-amber">🎁 Voucher zone</span>`;
    if (c.n >= 15) return `<span class="badge badge-pink">🔥 On fire</span>`;
    if (c.n > 0) return `<span class="badge badge-green">Active</span>`;
    return `<span class="badge badge-red">Needs a nudge</span>`;
  }

  function renderChampions() {
    const panel = $("#panel-champ");
    if (!X.champions.length) {
      panel.innerHTML = emptyState("🎖️", `No champions yet. <a class="c-cyan" href="#champion">Be the first.</a>`);
      return;
    }
    const me = mine();
    const rows = withMyRow(X.champions, 20).filter((r) => r.rank > 3 || r.gap);
    panel.innerHTML = podium(X.champions, "signups") + `
      <div class="card lb-card"><div class="table-wrap"><table class="table lb-table">
        <thead><tr><th>Rank</th><th>Champion</th><th>College</th><th>Role</th><th class="num">Signups</th><th>Status</th></tr></thead>
        <tbody>${rows.map(({ p, rank }) => `
          <tr class="${me.includes(p.code) ? "me" : ""}">
            <td class="rank">#${rank}</td>
            <td><div class="who">${UI.avatar(p.name)}<span>${esc(Store.displayName(p.name))}${me.includes(p.code) ? " (you)" : ""}</span></div></td>
            <td class="muted">${esc(p.college)}</td>
            <td class="muted small">${esc(p.role || "")}</td>
            <td class="num n">${p.n}</td>
            <td>${champStatus(p, rank)}</td>
          </tr>`).join("")}</tbody>
      </table></div></div>`;
  }

  function renderColleges() {
    const panel = $("#panel-college");
    const list = X.battle.filter((b) => b.n > 0).slice(0, 15);
    if (!list.length) { panel.innerHTML = emptyState("🏫", "No colleges on the board yet."); return; }
    const max = list[0].n;
    const mc = myCollege();
    panel.innerHTML = `<div class="card"><div class="cb-list">${list.map((b, i) => `
      <div class="cb-row${b.name === mc ? " me" : ""}">
        <span class="cb-rank">${i < 3 ? MEDALS[i] : "#" + (i + 1)}</span>
        <div class="cb-main">
          <span class="cb-name">${esc(b.name)}${b.name === mc ? " · your college" : ""}<small>${b.champs} champion${b.champs === 1 ? "" : "s"}</small></span>
          <div class="cb-track"><div class="cb-fill" data-w="${((b.n / max) * 100).toFixed(1)}"></div></div>
        </div>
        <span class="cb-val">${b.n}<small>${UI.pct(b.n / DS.registrations.length, 1)} of all</small></span>
      </div>`).join("")}</div></div>`;
    if (!panel.hidden) fillBars();
  }

  function fillBars() {
    requestAnimationFrame(() => $$("#panel-college .cb-fill").forEach((el) => (el.style.width = el.dataset.w + "%")));
  }

  function renderBoards() {
    renderReferrers();
    renderChampions();
    renderColleges();
  }

  UI.tabs($(".lb-tabs"), (tab) => { if (tab.id === "tab-college") fillBars(); });

  /* ---------- my stats ---------- */
  function renderMyStats(code) {
    const box = $("#my-stats");
    if (!code) {
      box.innerHTML = emptyState("🔑", `No code on this device yet. <a class="c-cyan" href="index.html#register">Register for the workshop</a> to get your personal link, or <a class="c-cyan" href="#champion">become a Campus Champion</a>.`);
      return;
    }
    const p = Store.findByCode(DS, code);
    if (!p) {
      box.innerHTML = emptyState("🔍", `No one with code <b class="mono">${esc(code)}</b> yet. Check the spelling. Codes look like <span class="mono">NAME-X7K</span>.`);
      return;
    }
    const isChamp = p.kind === "champion";
    const n = X.counts[p.code] || 0;
    const list = isChamp ? X.champions : X.referrers;
    const rank = list.findIndex((r) => r.code === p.code) + 1;
    const link = isChamp ? Share.championLink(p.code) : Share.referralLink(p.code);
    const msg = Share.messages(link);

    let bigNum, bigLbl, nextTxt, pct;
    if (isChamp) {
      const fifth = X.champions[4] ? X.champions[4].n : 0;
      if (rank && rank <= 5 && n > 0) {
        bigNum = "🎁"; bigLbl = "in the voucher zone"; nextTxt = "You're in the top 5. Keep posting to hold your spot."; pct = 100;
      } else {
        const need = Math.max(1, fifth - n + 1);
        bigNum = need; bigLbl = "signups to reach top 5"; nextTxt = `${need} more signups puts you in the ₹1,000 voucher zone.`; pct = fifth ? (n / (fifth + 1)) * 100 : 0;
      }
    } else {
      const next = C.rewards.find((t) => n < t.at);
      if (next) {
        bigNum = next.at - n; bigLbl = "to " + next.title; nextTxt = `${next.at - n} more ${next.at - n === 1 ? "friend" : "friends"} to unlock ${next.icon} ${next.title}.`; pct = (n / next.at) * 100;
      } else {
        bigNum = "🏆"; bigLbl = "all rewards unlocked"; nextTxt = "Every reward unlocked. Now chase the top-4 recharge!"; pct = 100;
      }
    }

    const referred = DS.registrations.filter((r) => r.referredBy === p.code).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    box.innerHTML = `
      <div class="ms-grid">
        <div>
          <div class="ms-profile">${UI.avatar(p.name)}<div>
            <h3>${esc(Store.displayName(p.name))} <span class="badge ${isChamp ? "badge-violet" : "badge-cyan"}">${isChamp ? "Campus Champion" : "Student"}</span></h3>
            <p>${esc(p.college)} · code <span class="mono c-lime">${esc(p.code)}</span></p>
          </div></div>
          <div class="ms-nums">
            <div class="ms-num"><b>${n}</b><span>${isChamp ? "signups via you" : "friends joined"}</span></div>
            <div class="ms-num"><b>${rank ? "#" + rank : "–"}</b><span>rank of ${list.length || 0}</span></div>
            <div class="ms-num"><b>${bigNum}</b><span>${esc(bigLbl)}</span></div>
          </div>
          <div class="ms-next"><span>${esc(nextTxt)}</span><div class="progress"><i id="ms-progress"></i></div></div>
        </div>
        <div class="ms-right">
          <span class="label">Your ${isChamp ? "tracking" : "invite"} link</span>
          <div class="copy-field"><code>${esc(link)}</code><button type="button" class="btn btn-ghost btn-sm" data-copy>Copy</button></div>
          <div class="ms-share">
            <a class="btn btn-wa" target="_blank" rel="noopener" href="${Share.wa(msg.en)}" data-share="wa-en">WhatsApp · EN</a>
            <a class="btn btn-wa" target="_blank" rel="noopener" href="${Share.wa(msg.te)}" data-share="wa-te">WhatsApp · తెలుగు</a>
          </div>
          <span class="label">People you brought in (${referred.length})</span>
          <div class="ref-list">${referred.slice(0, 40).map((r) => `
            <div class="ref-item">${UI.avatar(r.name)}<span>${esc(Store.displayName(r.name))}</span><small>${esc(r.college)} · Day ${r.day}</small></div>`).join("") ||
            `<div class="empty small">No one yet. Share your link above 👆</div>`}
          </div>
        </div>
      </div>`;
    requestAnimationFrame(() => $("#ms-progress").style.setProperty("--p", Math.min(100, pct).toFixed(1) + "%"));
    $("[data-copy]", box).addEventListener("click", () => { UI.copy(link, "Link"); Store.track("share", { channel: "copy" }); });
    $$("[data-share]", box).forEach((a) => a.addEventListener("click", () => Store.track("share", { channel: a.dataset.share })));
  }

  $("#lookup-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const code = Store.cleanCode($("#lookup-code").value);
    $("#lookup-code").value = code;
    renderMyStats(code);
  });

  /* ---------- Campus Champion kit ---------- */
  const cform = $("#champ-form");
  const cphone = $("#c-phone");
  cphone.addEventListener("input", () => {
    const d = cphone.value.replace(/\D/g, "").replace(/^(91|0)(?=\d{10})/, "").slice(0, 10);
    cphone.value = d.length > 5 ? d.slice(0, 5) + " " + d.slice(5) : d;
  });
  const CRULES = {
    name: (v) => v.trim().length >= 2 && /^\p{L}[\p{L}\p{M} .'-]*$/u.test(v.trim()),
    phone: (v) => /^[6-9]\d{9}$/.test(v.replace(/\D/g, "")),
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
    college: (v) => v.trim().length >= 3,
  };
  cform.addEventListener("submit", (e) => {
    e.preventDefault();
    let firstBad = null;
    Object.keys(CRULES).forEach((name) => {
      const input = cform.elements[name];
      const ok = CRULES[name](input.value);
      input.closest(".field").classList.toggle("invalid", !ok);
      input.closest(".field").classList.toggle("valid", ok);
      if (!ok && !firstBad) firstBad = input;
    });
    if (firstBad) { firstBad.focus(); UI.toast("Please fix the highlighted fields", "err"); return; }
    const data = Object.fromEntries(new FormData(cform).entries());
    Store.addChampion(data).then((res) => {
      if (res.offline) UI.toast("Saved on this device. The server couldn't be reached.", "err");
      UI.toast(res.existing ? "Welcome back! Here's your kit." : "Your Champion kit is ready", "ok", "🎖️");
      load(true).then(() => {
        renderKit(res.champion, true);
        if (!Store.myCode()) { $("#lookup-code").value = res.champion.code; renderMyStats(res.champion.code); }
      });
    });
  });

  function waveCard(w, i) {
    return `<article class="card wave" data-wave="${i}">
      <div class="wave-head">
        <span class="badge badge-violet">${esc(w.day)}</span>
        <div class="lang-toggle" role="group" aria-label="Message language">
          <button type="button" aria-pressed="true" data-lang="en">English</button>
          <button type="button" aria-pressed="false" data-lang="te">తెలుగు</button>
        </div>
      </div>
      <p class="wave-tip">💡 ${esc(w.tip)}</p>
      <pre>${esc(w.en)}</pre>
      <div class="wave-actions">
        <button type="button" class="btn btn-ghost btn-sm" data-copy-wave>Copy message</button>
        <a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${Share.wa(w.en)}" data-send>Send on WhatsApp</a>
      </div>
    </article>`;
  }

  function renderKit(ch, scroll) {
    const kit = $("#champ-kit");
    const link = Share.championLink(ch.code);
    const rank = X.battle.findIndex((b) => b.name === ch.college) + 1;
    const waves = Share.championWaves(link, { college: ch.college, count: DS.registrations.length, rank });
    const first = esc(String(ch.name).split(" ")[0]);
    kit.innerHTML = `
      <div class="kit-head">
        <div><span class="eyebrow">Your Champion kit</span><h3 class="mt-8">Ready to post, ${first} 🚀</h3></div>
        <a class="btn btn-ghost" href="#stats">View my live stats →</a>
      </div>
      <div class="card kit-link">
        <div>
          <span class="small" style="font-weight:700;color:var(--text-2)">Your tracking link · code <b class="mono c-lime">${esc(ch.code)}</b></span>
          <div class="copy-field mt-8"><code>${esc(link)}</code><button type="button" class="btn btn-ghost btn-sm" data-copy-link>Copy</button></div>
          <p class="tiny muted mt-8">Every signup through this link is credited to you on the Champions leaderboard, and the form pre-fills <b>${esc(ch.college)}</b> for your batch.</p>
        </div>
      </div>
      <div class="kit-grid">
        <div class="card poster-wrap">
          <div class="flex justify-between items-center"><b>QR poster</b><span class="badge badge-cyan">1080 × 1350</span></div>
          <canvas id="poster" width="1080" height="1350" aria-label="Workshop poster with your QR code"></canvas>
          <button type="button" class="btn btn-primary" data-dl>⬇ Download poster (PNG)</button>
          <p class="tiny muted">Print it for notice boards, or post it as your WhatsApp status.</p>
        </div>
        <div class="waves">${waves.map(waveCard).join("")}</div>
      </div>`;
    kit.hidden = false;

    $("[data-copy-link]", kit).addEventListener("click", () => UI.copy(link, "Tracking link"));
    $$(".wave", kit).forEach((card) => {
      const w = waves[Number(card.dataset.wave)];
      let lang = "en";
      $$("[data-lang]", card).forEach((b) => b.addEventListener("click", () => {
        lang = b.dataset.lang;
        $$("[data-lang]", card).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        $("pre", card).textContent = w[lang];
        $("[data-send]", card).href = Share.wa(w[lang]);
      }));
      $("[data-copy-wave]", card).addEventListener("click", () => UI.copy(w[lang], "Message"));
    });

    const canvas = $("#poster");
    drawPoster(canvas, ch, link);
    $("[data-dl]", kit).addEventListener("click", () => {
      canvas.toBlob((blob) => {
        if (!blob) return UI.toast("Couldn't export the poster", "err");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `buildai60-poster-${ch.code}.png`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      }, "image/png");
    });
    if (scroll) kit.scrollIntoView({ behavior: UI.reduceMotion ? "auto" : "smooth", block: "start" });
  }

  /* ---------- poster (canvas) ---------- */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function glow(ctx, x, y, r, color) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(5,6,11,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function wrap(ctx, text, x, y, maxW, lh) {
    const words = text.split(" ");
    let line = "";
    words.forEach((w) => {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y); line = w; y += lh; }
      else line = test;
    });
    if (line) ctx.fillText(line, x, y);
    return y + lh;
  }

  function drawPoster(canvas, ch, link) {
    const ctx = canvas.getContext("2d");
    const W = 1080, H = 1350;
    const D = '"Bricolage Grotesque", "Segoe UI", sans-serif';
    const B = 'Manrope, "Segoe UI", sans-serif';
    const M = '"JetBrains Mono", Consolas, monospace';
    const wDate = C.workshopDate();
    const when = UI.dateFmt(wDate, { weekday: "short", day: "numeric", month: "short" }) + " · " +
      UI.dateFmt(wDate, { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase() + " IST";

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#05060b";
      ctx.fillRect(0, 0, W, H);
      glow(ctx, 160, 140, 720, "rgba(124,107,255,0.55)");
      glow(ctx, 1000, 560, 620, "rgba(47,227,240,0.3)");
      glow(ctx, 480, 1380, 620, "rgba(195,247,92,0.16)");

      ctx.strokeStyle = "rgba(255,255,255,0.045)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 72) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y <= H; y += 72) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // neural decoration (deterministic per code)
      let seed = UI.hash(ch.code);
      const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
      const nodes = Array.from({ length: 22 }, () => ({ x: 620 + rnd() * 440, y: 60 + rnd() * 520 }));
      nodes.forEach((a, i) => nodes.slice(i + 1).forEach((b) => {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 170) { ctx.strokeStyle = `rgba(143,125,255,${(1 - d / 170) * 0.5})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }));
      nodes.forEach((n, i) => { ctx.fillStyle = i % 3 ? "rgba(47,227,240,0.9)" : "rgba(195,247,92,0.9)"; ctx.beginPath(); ctx.arc(n.x, n.y, 3.2, 0, Math.PI * 2); ctx.fill(); });

      // pill
      roundRect(ctx, 80, 92, 560, 62, 31);
      ctx.fillStyle = "rgba(255,255,255,0.07)"; ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.stroke();
      ctx.fillStyle = "#3ee6a0"; ctx.beginPath(); ctx.arc(116, 123, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#eef0fb"; ctx.font = `600 24px ${M}`; ctx.textBaseline = "middle";
      ctx.fillText("FREE LIVE WORKSHOP · NXTWAVE", 138, 124);
      ctx.textBaseline = "alphabetic";

      // title
      ctx.font = `800 116px ${D}`;
      ctx.fillStyle = "#ffffff";
      ctx.fillText("Build Your First", 76, 318);
      const g = ctx.createLinearGradient(76, 0, 700, 0);
      g.addColorStop(0, "#8f7dff"); g.addColorStop(0.6, "#2fe3f0"); g.addColorStop(1, "#c3f75c");
      ctx.fillStyle = g;
      ctx.fillText("AI Project", 76, 444);
      ctx.fillStyle = "#ffffff";
      ctx.fillText("in 60 Minutes.", 76, 570);

      // sub
      ctx.font = `500 38px ${B}`;
      ctx.fillStyle = "#b9bdd6";
      wrap(ctx, "Walk in with zero AI experience. Walk out with a live AI app + GitHub link for your resume.", 80, 660, 900, 54);

      // chips
      let cx = 80;
      ["📅 " + when, "💻 Live on Zoom", "🎓 Certificate"].forEach((t) => {
        ctx.font = `700 26px ${B}`;
        const w = ctx.measureText(t).width + 48;
        roundRect(ctx, cx, 800, w, 64, 18);
        ctx.fillStyle = "rgba(255,255,255,0.07)"; ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.stroke();
        ctx.fillStyle = "#eef0fb";
        ctx.fillText(t, cx + 24, 842);
        cx += w + 16;
      });

      // QR panel
      roundRect(ctx, 80, 932, 920, 320, 32);
      const pg = ctx.createLinearGradient(80, 932, 1000, 1252);
      pg.addColorStop(0, "rgba(124,107,255,0.22)"); pg.addColorStop(1, "rgba(47,227,240,0.1)");
      ctx.fillStyle = pg; ctx.fill();
      ctx.strokeStyle = "rgba(143,125,255,0.6)"; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1;
      roundRect(ctx, 112, 964, 256, 256, 20);
      ctx.fillStyle = "#ffffff"; ctx.fill();
      drawQR(ctx, link, 126, 978, 228);

      ctx.fillStyle = "#ffffff"; ctx.font = `800 52px ${D}`;
      ctx.fillText("Scan to register", 410, 1036);
      ctx.fillStyle = "#8b90ae"; ctx.font = `600 26px ${B}`;
      ctx.fillText("or use invite code", 412, 1086);
      ctx.fillStyle = "#c3f75c"; ctx.font = `700 50px ${M}`;
      ctx.fillText(ch.code, 410, 1146);
      ctx.fillStyle = "#b9bdd6"; ctx.font = `600 24px ${B}`;
      wrap(ctx, `Shared by ${Store.displayName(ch.name)} · Campus Champion, ${ch.college}`, 412, 1196, 560, 32);

      ctx.fillStyle = "#5d6283"; ctx.font = `600 24px ${B}`; ctx.textAlign = "center";
      ctx.fillText("Free · 60 minutes · No AI experience needed", W / 2, 1306);
      ctx.textAlign = "left";
    };

    const fontsReady = document.fonts && document.fonts.load
      ? Promise.all([document.fonts.load(`800 116px ${D}`), document.fonts.load(`500 38px ${B}`), document.fonts.load(`700 50px ${M}`)]).catch(() => {})
      : Promise.resolve();
    draw();
    fontsReady.then(draw);
  }

  function drawQR(ctx, text, x, y, size) {
    if (typeof window.QRCode === "undefined") {
      ctx.fillStyle = "#05060b";
      ctx.font = '600 18px "JetBrains Mono", monospace';
      ctx.fillText("Open:", x + 10, y + 40);
      wrap(ctx, text.replace(/^https?:\/\//, "").replace(/([/?&])/g, "$1 "), x + 10, y + 72, size - 20, 24);
      return;
    }
    const tmp = document.createElement("div");
    new QRCode(tmp, { text, width: size, height: size, colorDark: "#05060b", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
    const qc = tmp.querySelector("canvas");
    if (qc) ctx.drawImage(qc, x, y, size, size);
  }

  /* ---------- boot ---------- */
  load().then(() => {
    const qp = new URLSearchParams(location.search).get("code");
    const code = Store.cleanCode(qp) || Store.myCode() || Store.myChampionCode();
    if (code) $("#lookup-code").value = code;
    renderMyStats(code);
    const champ = Store.myChampion();
    if (champ) renderKit(champ, false);
  });
})();

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

  // Prize facts (see C.topReferrerPrize / C.championPrize): top 4 referrers get a ₹100 recharge,
  // the top 5 Campus Champions share a ₹1,000 voucher pool.
  $("#prize-line").textContent = "When sign-ups close, the four students with the most friends registered each get a ₹100 mobile recharge, and the five leading Campus Champions divide a ₹1,000 Amazon voucher pool.";
  $("#champ-prize").textContent = "🎁 Top 5 split ₹1,000 in vouchers";
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
    const prize = rank <= 4 ? ` <span class="badge badge-amber">Top 4 · ₹100 recharge</span>` : "";
    return (tier ? `<span class="rw">${tier.icon} ${esc(tier.title)}</span>` : `<span class="dim">—</span>`) + prize;
  }

  // Reward ladder from C.rewards. n = null shows the thresholds; a number shows progress against them.
  function tiers(n, compact) {
    return `<ol class="tiers${compact ? " tiers-compact" : ""}">${C.rewards.map((t) => {
      const done = n != null && n >= t.at;
      const meta = n == null ? `Bring ${t.at} ${t.at === 1 ? "friend" : "friends"}` : done ? "Yours ✓" : `${t.at - n} more`;
      return `<li class="tier${done ? " is-done" : ""}">
        <span class="tier-icon" aria-hidden="true">${t.icon}</span>
        <span class="tier-main"><b>${esc(t.title)}</b>${compact ? "" : `<small>${esc(t.desc)}</small>`}</span>
        <span class="tier-at">${meta}</span>
      </li>`;
    }).join("")}</ol>`;
  }

  function intro(text) { return `<p class="lb-intro">${text}</p>`; }

  function withMyRow(list, limit) {
    const rows = list.slice(0, limit).map((p, i) => ({ p, rank: i + 1 }));
    mine().forEach((code) => {
      const i = list.findIndex((p) => p.code === code);
      if (i >= limit) rows.push({ p: list[i], rank: i + 1, gap: true });
    });
    return rows;
  }

  function emptyState(icon, html) { return `<div class="empty"><span class="e-icon">${icon}</span>${html}</div>`; }

  // Name cell: on phones the college column is hidden and shown under the name instead
  function who(p, me) {
    return `<div class="who">${UI.avatar(p.name)}<span class="who-name"><b>${esc(Store.displayName(p.name))}${me.includes(p.code) ? " (you)" : ""}</b><small>${esc(p.college)}</small></span></div>`;
  }

  function renderReferrers() {
    const panel = $("#panel-ref");
    const head = intro("One point for every friend who registers with your code. If two students are level, the one who signed up earlier ranks higher.");
    if (!X.referrers.length) {
      panel.innerHTML = head + emptyState("🚀", `Nobody has scored yet. <a class="c-indigo" href="index.html#register">Register</a>, send your link to one group, and the first friend who joins puts you on top.`);
      return;
    }
    const me = mine();
    const rows = withMyRow(X.referrers, 15).filter((r) => r.rank > 3 || r.gap);
    panel.innerHTML = head + podium(X.referrers, "friends") + (rows.length ? `
      <div class="card lb-card"><div class="table-wrap"><table class="table lb-table">
        <thead><tr><th>Place</th><th>Inviter</th><th class="col-college">College</th><th class="num">Sign-ups</th><th>Reward reached</th></tr></thead>
        <tbody>${rows.map(({ p, rank }) => `
          <tr class="${me.includes(p.code) ? "me" : ""}">
            <td class="rank">#${rank}</td>
            <td>${who(p, me)}</td>
            <td class="muted col-college">${esc(p.college)}</td>
            <td class="num n">${p.n}</td>
            <td>${rewardFor(p.n, rank)}</td>
          </tr>`).join("")}</tbody>
      </table></div></div>` : "");
  }

  function champStatus(c, rank) {
    if (rank <= 5 && c.n > 0) return `<span class="badge badge-amber">🎁 Voucher share</span>`;
    if (c.n >= 15) return `<span class="badge badge-rose">🔥 15 or more</span>`;
    if (c.n > 0) return `<span class="badge badge-green">On the board</span>`;
    return `<span class="badge badge-red">No sign-ups yet</span>`;
  }

  function renderChampions() {
    const panel = $("#panel-champ");
    const head = intro("Registrations that came through each champion's tracking link. Places 1 to 5 split the ₹1,000 voucher pool when the week ends.");
    if (!X.champions.length) {
      panel.innerHTML = head + emptyState("🎖️", `The Campus Champions board has no names yet. <a class="c-indigo" href="#champion">Put yours here first</a>`);
      return;
    }
    const me = mine();
    const rows = withMyRow(X.champions, 20).filter((r) => r.rank > 3 || r.gap);
    panel.innerHTML = head + podium(X.champions, "sign-ups") + `
      <div class="card lb-card"><div class="table-wrap"><table class="table lb-table">
        <thead><tr><th>Place</th><th>Campus Champion</th><th class="col-college">College</th><th>Campus role</th><th class="num">Sign-ups</th><th>Prize status</th></tr></thead>
        <tbody>${rows.map(({ p, rank }) => `
          <tr class="${me.includes(p.code) ? "me" : ""}">
            <td class="rank">#${rank}</td>
            <td>${who(p, me)}</td>
            <td class="muted col-college">${esc(p.college)}</td>
            <td class="muted small">${esc(p.role || "")}</td>
            <td class="num n">${p.n}</td>
            <td>${champStatus(p, rank)}</td>
          </tr>`).join("")}</tbody>
      </table></div></div>`;
  }

  function renderColleges() {
    const panel = $("#panel-college");
    const list = X.battle.filter((b) => b.n > 0).slice(0, 15);
    const head = intro("A registration adds to the student's own college, whether it came from a friend, a champion or any other channel. The longest bar belongs to the current leader.");
    if (!list.length) { panel.innerHTML = head + emptyState("🏫", "No college has a registration yet. One sign-up from your campus puts it on the list."); return; }
    const max = list[0].n;
    const mc = myCollege();
    panel.innerHTML = head + `<div class="card cb-card"><div class="cb-list">${list.map((b, i) => `
      <div class="cb-row${b.name === mc ? " me" : ""}">
        <span class="cb-rank">${i < 3 ? MEDALS[i] : "#" + (i + 1)}</span>
        <div class="cb-main">
          <span class="cb-name">${esc(b.name)}${b.name === mc ? " · your campus" : ""}<small>${b.champs ? `${b.champs} Campus Champion${b.champs === 1 ? "" : "s"} here` : "needs a champion"}</small></span>
          <div class="cb-track"><div class="cb-fill" data-w="${((b.n / max) * 100).toFixed(1)}"></div></div>
        </div>
        <span class="cb-val">${b.n}<small>${UI.pct(b.n / DS.registrations.length, 1)} share</small></span>
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
      box.innerHTML = emptyState("🔑", `Your score shows up here once you have an invite code. <a class="c-indigo" href="index.html#register">Book your free seat</a> to get one, and this device will load it for you next time. Run a class or club group? <a class="c-indigo" href="#champion">Get the Champion kit</a>.`) +
        `<div class="ms-ladder"><span class="label">Rewards waiting for you</span>${tiers(null)}</div>`;
      return;
    }
    const p = Store.findByCode(DS, code);
    if (!p && X.counts[code]) {
      const k = X.counts[code];
      box.innerHTML = emptyState("🔗", `Code <b class="mono">${esc(code)}</b> has <b>${k}</b> ${k === 1 ? "sign-up" : "sign-ups"} recorded in this browser, but its owner's registration was saved on another device.${Store.isRemote() ? "" : " This demo stores data per browser until the shared Google Sheets backend is switched on."}`);
      return;
    }
    if (!p) {
      box.innerHTML = emptyState("🔍", `<b class="mono">${esc(code)}</b> doesn't match anyone yet. Codes start with up to four letters of a name, then a dash and three letters or digits, like <span class="mono">RAVI-7K2</span>. Look for a mistyped character and try again.`);
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
        bigNum = "🎁"; bigLbl = "top-5 place held"; nextTxt = "You're in the top 5 for the ₹1,000 voucher pool right now. Other champions are still posting, so one more share this evening helps protect your place."; pct = 100;
      } else {
        const need = Math.max(1, fifth - n + 1);
        const bar = X.champions[4] ? `The #5 champion has ${fifth} right now. ` : "";
        bigNum = need; bigLbl = "sign-ups to catch #5"; nextTxt = `${bar}${need} more ${need === 1 ? "sign-up" : "sign-ups"} through your link moves you into the voucher pool.`; pct = fifth ? (n / (fifth + 1)) * 100 : 0;
      }
    } else {
      const next = C.rewards.find((t) => n < t.at);
      if (next) {
        const gap = next.at - n;
        bigNum = gap; bigLbl = "until " + next.title; nextTxt = `${next.icon} ${next.title} unlocks at ${next.at} ${next.at === 1 ? "friend" : "friends"}. You need ${gap} more.`; pct = (n / next.at) * 100;
      } else {
        bigNum = "🏆"; bigLbl = "rewards: 3 of 3"; nextTxt = "Nothing left to unlock. Finish among the top 4 students when the week ends and the ₹100 mobile recharge is yours too."; pct = 100;
      }
    }

    const referred = DS.registrations.filter((r) => r.referredBy === p.code).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    box.innerHTML = `
      <div class="ms-grid">
        <div>
          <div class="ms-profile">${UI.avatar(p.name)}<div>
            <h3>${esc(Store.displayName(p.name))} <span class="badge ${isChamp ? "badge-indigo" : "badge-teal"}">${isChamp ? "Campus Champion" : "Seat booked"}</span></h3>
            <p>${esc(p.college)} · code <span class="mono c-coral">${esc(p.code)}</span></p>
          </div></div>
          <div class="ms-nums">
            <div class="ms-num"><b>${n}</b><span>${isChamp ? (n === 1 ? "sign-up" : "sign-ups") + " on your link" : n === 1 ? "friend joined" : "friends joined"}</span></div>
            <div class="ms-num"><b>${rank ? "#" + rank : "–"}</b><span>${rank ? `among ${list.length} ${isChamp ? "champions" : "students"}` : "unranked until a friend joins"}</span></div>
            <div class="ms-num"><b>${bigNum}</b><span>${esc(bigLbl)}</span></div>
          </div>
          <div class="ms-next"><span>${esc(nextTxt)}</span><div class="progress"><i id="ms-progress"></i></div></div>
          ${isChamp ? "" : `<div class="ms-ladder"><span class="label">Rewards and where you stand</span>${tiers(n, true)}</div>`}
        </div>
        <div class="ms-right">
          <span class="label">${isChamp ? "Link to post in your groups" : "Send this link to friends"}</span>
          <div class="copy-field"><code>${esc(link)}</code><button type="button" class="btn btn-ghost btn-sm" data-copy>Copy link</button></div>
          <div class="ms-share">
            <a class="btn btn-wa" target="_blank" rel="noopener" href="${Share.wa(msg.en)}" data-share="wa-en">Share in English</a>
            <a class="btn btn-wa" target="_blank" rel="noopener" href="${Share.wa(msg.te)}" data-share="wa-te">Share in తెలుగు</a>
          </div>
          <span class="label">${isChamp ? "Students from your link" : "Friends who joined"} (${referred.length})</span>
          <div class="ref-list">${referred.slice(0, 40).map((r) => `
            <div class="ref-item">${UI.avatar(r.name)}<span>${esc(Store.displayName(r.name))}</span><small>${esc(r.college)} · Day ${r.day}</small></div>`).join("") ||
            `<div class="empty small">Nobody yet. Post the link in your class group this evening, when most people are online, and look again tomorrow.</div>`}
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
    if (firstBad) { firstBad.focus(); UI.toast("Check the fields marked in red", "err"); return; }
    const data = Object.fromEntries(new FormData(cform).entries());
    Store.addChampion(data).then((res) => {
      if (res.offline) UI.toast("The server didn't respond, so your kit is saved on this device only.", "err");
      UI.toast(res.existing ? "This number or email already has a kit. Here it is again." : "Kit created. Your Day 2 post is first in line.", "ok", "🎖️");
      load(true).then(() => {
        renderKit(res.champion, true);
        if (!Store.myCode()) { $("#lookup-code").value = res.champion.code; renderMyStats(res.champion.code); }
      });
    });
  });

  function waveCard(w, i) {
    return `<article class="card wave" data-wave="${i}">
      <div class="wave-head">
        <span class="badge badge-indigo">${esc(w.day)}</span>
        <div class="lang-toggle" role="group" aria-label="Message language">
          <button type="button" aria-pressed="true" data-lang="en">English</button>
          <button type="button" aria-pressed="false" data-lang="te">తెలుగు</button>
        </div>
      </div>
      <p class="wave-tip">🕖 ${esc(w.tip)}</p>
      <pre>${esc(w.en)}</pre>
      <div class="wave-actions">
        <button type="button" class="btn btn-ghost btn-sm" data-copy-wave>Copy post</button>
        <a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${Share.wa(w.en)}" data-send>Post via WhatsApp</a>
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
        <div><span class="eyebrow">Champion kit for ${esc(ch.college)}</span><h3 class="mt-16">${first}, your posts are ready</h3></div>
        <a class="btn btn-ghost" href="#stats">See my score →</a>
      </div>
      <div class="card kit-link">
        <div>
          <span class="kit-label">Post this link · code <b class="mono c-coral">${esc(ch.code)}</b></span>
          <div class="copy-field mt-8"><code>${esc(link)}</code><button type="button" class="btn btn-ghost btn-sm" data-copy-link>Copy link</button></div>
          <p class="tiny muted mt-8">Whoever opens it gets the registration form with <b>${esc(ch.college)}</b> already selected. When they submit, the sign-up is credited to you on the Campus Champions board.</p>
        </div>
      </div>
      <div class="kit-grid">
        <div class="card poster-wrap">
          <div class="flex justify-between items-center"><b>Poster with your QR code</b><span class="badge badge-teal">1080 × 1350</span></div>
          <canvas id="poster" width="1080" height="1350" aria-label="Printable workshop poster with your QR code and invite code"></canvas>
          <button type="button" class="btn btn-primary" data-dl>⬇ Download the PNG</button>
          <p class="tiny muted">Pin a printout near the labs or the canteen, and put the same image on your WhatsApp status with the Day 2 post.</p>
        </div>
        <div class="waves">
          <div class="waves-head"><b>Your WhatsApp schedule</b><span>English shows first. Switch any card to తెలుగు and its copy and send buttons follow your choice.</span></div>
          ${waves.map(waveCard).join("")}
        </div>
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
        if (!blob) return UI.toast("Saving the poster failed. Try once more.", "err");
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
  // 1080 x 1350 "Aurora light" poster: paper + soft colour blobs, brand row, workshop headline,
  // date line, a white card with the QR + invite code + champion, and a coral call-to-action band.
  const INK = "#16143a", INK2 = "#45436a", MUTED = "#6b6990", INDIGO = "#3d3bd9";
  const PAPER = "#f6f5fb", LAVENDER = "#efeef8", INDIGO_SOFT = "#eeedfd";

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  // soft aurora blob: rgb is "r,g,b"
  function blob(ctx, x, y, r, rgb, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(0.55, `rgba(${rgb},${(a * 0.45).toFixed(3)})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function wrap(ctx, text, x, y, maxW, lh, maxLines) {
    const words = text.split(" ");
    const lines = [];
    let line = "";
    words.forEach((w) => {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
      else line = test;
    });
    if (line) lines.push(line);
    if (maxLines && lines.length > maxLines) {
      const keep = lines.slice(0, maxLines);
      let last = keep[maxLines - 1];
      while (last.length > 1 && ctx.measureText(last + "…").width > maxW) last = last.slice(0, -1);
      keep[maxLines - 1] = last.trimEnd() + "…";
      lines.length = 0;
      lines.push.apply(lines, keep);
    }
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
    return y + lines.length * lh;
  }
  // letter-spacing where the browser supports it on canvas (Chrome/Edge/Firefox); a no-op elsewhere
  function track(ctx, px) { if ("letterSpacing" in ctx) ctx.letterSpacing = px + "px"; }
  // largest size (<= max) at which every line fits maxW
  function fitSize(ctx, lines, weight, family, max, maxW) {
    let size = max;
    for (; size > 40; size -= 2) {
      ctx.font = `${weight} ${size}px ${family}`;
      track(ctx, -size * 0.035);
      if (lines.every((l) => ctx.measureText(l).width <= maxW)) break;
    }
    return size;
  }

  function drawPoster(canvas, ch, link) {
    const ctx = canvas.getContext("2d");
    const W = 1080, H = 1350, X = 80, CW = W - X * 2;
    const D = 'Sora, "Segoe UI", sans-serif';
    const B = '"Plus Jakarta Sans", "Segoe UI", sans-serif';
    const M = '"IBM Plex Mono", Consolas, monospace';
    const wDate = C.workshopDate();
    const day = UI.dateFmt(wDate, { weekday: "short", day: "numeric", month: "short" });
    const time = UI.dateFmt(wDate, { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase() + " IST";
    const who = Store.displayName(ch.name);

    const draw = () => {
      ctx.save();
      ctx.clearRect(0, 0, W, H);
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";

      // paper + aurora
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, W, H);
      blob(ctx, 110, 150, 640, "111,108,242", 0.42);
      blob(ctx, 1040, 560, 560, "255,143,94", 0.36);
      blob(ctx, 170, 1220, 560, "43,196,180", 0.26);

      // faint dot grid fading toward the bottom
      for (let y = 36; y < 760; y += 36) {
        ctx.fillStyle = `rgba(61,59,217,${(0.16 * (1 - y / 760)).toFixed(3)})`;
        for (let x = 36; x < W; x += 36) { ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill(); }
      }

      // brand row
      roundRect(ctx, X, 80, 76, 76, 24);
      const lg = ctx.createLinearGradient(X, 80, X + 76, 156);
      lg.addColorStop(0, "#3d3bd9"); lg.addColorStop(0.5, "#8b5cf6"); lg.addColorStop(1, "#ff6b4a");
      ctx.fillStyle = lg; ctx.fill();
      ctx.fillStyle = "#ffffff"; ctx.font = `800 30px ${D}`; ctx.textAlign = "center"; track(ctx, -1);
      ctx.fillText("AI", X + 38, 129);
      ctx.textAlign = "left";
      ctx.beginPath(); ctx.arc(X + 72, 84, 11, 0, Math.PI * 2);
      ctx.fillStyle = "#ff6b4a"; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = "#ffffff"; ctx.stroke();
      ctx.fillStyle = INK; ctx.font = `800 40px ${D}`; track(ctx, -1.4);
      ctx.fillText("BuildAI·60", X + 100, 118);
      ctx.fillStyle = MUTED; ctx.font = `700 17px ${B}`; track(ctx, 2.6);
      ctx.fillText("BY NXTWAVE", X + 102, 148);

      // "live on Zoom" pill, right aligned
      ctx.font = `700 20px ${B}`; track(ctx, 1.6);
      const live = "LIVE ON ZOOM · 60 MIN";
      const lw = ctx.measureText(live).width + 70;
      roundRect(ctx, W - X - lw, 92, lw, 52, 26);
      ctx.fillStyle = "#ffffff"; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = "rgba(28,25,80,0.1)"; ctx.stroke();
      ctx.beginPath(); ctx.arc(W - X - lw + 30, 118, 7, 0, Math.PI * 2); ctx.fillStyle = "#15803d"; ctx.fill();
      ctx.beginPath(); ctx.arc(W - X - lw + 30, 118, 13, 0, Math.PI * 2); ctx.fillStyle = "rgba(21,128,61,0.16)"; ctx.fill();
      ctx.fillStyle = INK; ctx.textBaseline = "middle";
      ctx.fillText(live, W - X - lw + 50, 119);
      ctx.textBaseline = "alphabetic";

      // eyebrow pill with a coral dot
      ctx.font = `800 21px ${B}`; track(ctx, 2.6);
      const eb = "NO FEE · FINAL-YEAR ENGINEERING";
      const ew = ctx.measureText(eb).width + 72;
      roundRect(ctx, X, 214, ew, 52, 26);
      ctx.fillStyle = INDIGO_SOFT; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = "rgba(61,59,217,0.14)"; ctx.stroke();
      ctx.beginPath(); ctx.arc(X + 28, 240, 7, 0, Math.PI * 2); ctx.fillStyle = "#ff6b4a"; ctx.fill();
      ctx.fillStyle = INDIGO; ctx.textBaseline = "middle";
      ctx.fillText(eb, X + 48, 241);
      ctx.textBaseline = "alphabetic";

      // headline: the workshop name over three lines, the middle one in the brand gradient
      const lines = ["Build Your First", "AI Project", "in 60 Minutes."];
      const size = fitSize(ctx, lines, 800, D, 112, CW);
      const lh = Math.round(size * 1.04);
      const top = 300 + Math.round(size * 0.78);
      ctx.fillStyle = INK;
      ctx.fillText(lines[0], X - 4, top);
      const gw = ctx.measureText(lines[1]).width;
      const tg = ctx.createLinearGradient(X, 0, X + gw, 0);
      tg.addColorStop(0, "#3d3bd9"); tg.addColorStop(0.5, "#8b5cf6"); tg.addColorStop(1, "#ff6b4a");
      ctx.fillStyle = tg;
      ctx.fillText(lines[1], X - 4, top + lh);
      ctx.fillStyle = INK;
      ctx.fillText(lines[2], X - 4, top + lh * 2);
      let y = top + lh * 2;

      // date / time line
      y += 82;
      track(ctx, -0.6);
      ctx.font = `700 36px ${D}`; ctx.fillStyle = INDIGO;
      const dl = `${day} · ${time}`;
      ctx.fillText(dl, X, y);
      let dx = X + ctx.measureText(dl).width, fits = true;
      ctx.font = `600 30px ${B}`; ctx.fillStyle = INK2; track(ctx, 0);
      [C.workshop.languages, "Free certificate"].forEach((t) => {
        const seg = "  ·  " + t, sw = ctx.measureText(seg).width;
        if (fits && dx + sw <= X + CW) { ctx.fillText(seg, dx, y); dx += sw; } else fits = false;
      });

      // sub line
      ctx.font = `500 29px ${B}`; ctx.fillStyle = INK2;
      wrap(ctx, "Start with zero AI knowledge. Finish with your own AI app online and a GitHub link for your resume.", X, y + 58, CW, 42, 2);

      // white QR card
      const cy = 836, chh = 344;
      ctx.save();
      ctx.shadowColor = "rgba(22,20,58,0.16)"; ctx.shadowBlur = 60; ctx.shadowOffsetY = 26;
      roundRect(ctx, X, cy, CW, chh, 40);
      ctx.fillStyle = "#ffffff"; ctx.fill();
      ctx.restore();
      roundRect(ctx, X, cy, CW, chh, 40);
      ctx.lineWidth = 2; ctx.strokeStyle = "rgba(28,25,80,0.08)"; ctx.stroke();
      // the white card is the QR's quiet zone (40px+ on every side)
      const qs = 264, qx = X + 40, qy = cy + (chh - qs) / 2;
      drawQR(ctx, link, qx, qy, qs);

      const rx = qx + qs + 44, rw = X + CW - 40 - rx;
      ctx.fillStyle = INK; ctx.font = `800 46px ${D}`; track(ctx, -1.4);
      ctx.fillText("Scan & join free", rx, cy + 84);
      ctx.fillStyle = MUTED; ctx.font = `600 23px ${B}`; track(ctx, 0);
      ctx.fillText("Your champion's code", rx, cy + 124);
      // code pill: lavender with a dashed indigo border, code in IBM Plex Mono
      ctx.font = `600 42px ${M}`; track(ctx, 1);
      const cw = Math.min(rw, ctx.measureText(ch.code).width + 52);
      roundRect(ctx, rx, cy + 146, cw, 70, 35);
      ctx.fillStyle = LAVENDER; ctx.fill();
      ctx.setLineDash([9, 7]); ctx.lineWidth = 2; ctx.strokeStyle = "rgba(61,59,217,0.45)"; ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = INDIGO; ctx.textBaseline = "middle";
      ctx.fillText(ch.code, rx + 26, cy + 183);
      ctx.textBaseline = "alphabetic"; track(ctx, 0);
      // champion
      ctx.beginPath(); ctx.moveTo(rx, cy + 242); ctx.lineTo(rx + rw, cy + 242);
      ctx.lineWidth = 2; ctx.strokeStyle = "rgba(22,20,58,0.07)"; ctx.stroke();
      ctx.beginPath(); ctx.arc(rx + 26, cy + 284, 26, 0, Math.PI * 2);
      ctx.fillStyle = INDIGO_SOFT; ctx.fill();
      ctx.fillStyle = INDIGO; ctx.font = `800 19px ${B}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(UI.initials(ch.name), rx + 26, cy + 285);
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillStyle = INK; ctx.font = `800 24px ${B}`;
      wrap(ctx, `Posted by ${who}`, rx + 68, cy + 278, rw - 68, 30, 1);
      ctx.fillStyle = INK2; ctx.font = `600 20px ${B}`;
      wrap(ctx, `Campus Champion · ${ch.college}`, rx + 68, cy + 306, rw - 68, 26, 2);

      // coral call-to-action band with ink text
      const by = 1214, bh = 92;
      ctx.save();
      ctx.shadowColor = "rgba(255,107,74,0.45)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
      roundRect(ctx, X, by, CW, bh, bh / 2);
      const bg = ctx.createLinearGradient(X, 0, X + CW, 0);
      bg.addColorStop(0, "#ff6b4a"); bg.addColorStop(1, "#ff8f5e");
      ctx.fillStyle = bg; ctx.fill();
      ctx.restore();
      ctx.fillStyle = INK; ctx.textBaseline = "middle";
      ctx.font = `800 31px ${D}`; track(ctx, -0.8);
      ctx.fillText("Register free today", X + 44, by + bh / 2 + 1);
      ctx.font = `600 25px ${B}`; track(ctx, 0); ctx.textAlign = "right";
      ctx.fillText("Laptop + Chrome is all you need  →", X + CW - 44, by + bh / 2 + 1);
      ctx.restore();
    };

    // Draw once the poster fonts are ready, but never wait longer than 2.5 s: after that, draw with
    // fallback fonts and redraw if the real ones arrive later.
    const loads = document.fonts && document.fonts.load
      ? Promise.all([
        document.fonts.load(`800 112px Sora`), document.fonts.load(`700 36px Sora`),
        document.fonts.load(`500 29px "Plus Jakarta Sans"`), document.fonts.load(`800 24px "Plus Jakarta Sans"`),
        document.fonts.load(`600 42px "IBM Plex Mono"`),
      ]).then(() => true, () => false)
      : Promise.resolve(false);
    let timedOut = false;
    const timeout = new Promise((r) => setTimeout(() => { timedOut = true; r(); }, 2500));
    Promise.race([loads, timeout]).then(() => {
      draw();
      if (timedOut) loads.then((ok) => { if (ok) draw(); });
    });
  }

  function drawQR(ctx, text, x, y, size) {
    if (typeof window.QRCode === "undefined") {
      // offline: print the link instead
      roundRect(ctx, x, y, size, size, 24);
      ctx.fillStyle = LAVENDER; ctx.fill();
      ctx.fillStyle = INK;
      ctx.font = '600 20px "IBM Plex Mono", Consolas, monospace';
      ctx.fillText("Visit:", x + 18, y + 44);
      wrap(ctx, text.replace(/^https?:\/\//, "").replace(/([/?&])/g, "$1 "), x + 18, y + 78, size - 36, 26, 7);
      return;
    }
    const tmp = document.createElement("div");
    const qr = new QRCode(tmp, { text, width: size, height: size, colorDark: INK, colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
    const model = qr && qr._oQRCode;
    if (model && model.getModuleCount) {
      // draw the modules ourselves on whole pixels: crisp edges, no seams between modules
      const n = model.getModuleCount();
      const cell = Math.floor(size / n);
      const off = Math.round((size - cell * n) / 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = INK;
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) if (model.isDark(r, c)) ctx.fillRect(x + off + c * cell, y + off + r * cell, cell, cell);
      }
      return;
    }
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

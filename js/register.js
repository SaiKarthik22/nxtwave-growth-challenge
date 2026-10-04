/* =========================================================
   BuildAI·60 — Registration + referral engine
   6-field form → validation → Store.register → success card
   with seat number, referral link, 1-tap shares, reward
   progress, calendar invite and confetti.
   ========================================================= */
(function () {
  "use strict";
  const C = window.CONFIG;
  const $ = UI.$, $$ = UI.$$;
  const form = $("#reg-form");
  const success = $("#reg-success");
  if (!form) return;

  /* ---------- populate options ---------- */
  $("#college-list").innerHTML = C.colleges.map((c) => `<option value="${UI.esc(c)}"></option>`).join("");
  $("#f-branch").insertAdjacentHTML("beforeend", C.branches.map((b) => `<option>${UI.esc(b)}</option>`).join(""));

  /* ---------- validation ---------- */
  const RULES = {
    name: (v) => v.trim().length >= 2 && v.trim().length <= 60 && /^\p{L}[\p{L}\p{M} .'-]*$/u.test(v.trim()),
    phone: (v) => /^[6-9]\d{9}$/.test(v.replace(/\D/g, "")),
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
    college: (v) => v.trim().length >= 3,
    branch: (v) => !!v,
    gradYear: (v) => !!v,
  };
  const fieldOf = (input) => input.closest(".field");

  function check(input, showValid) {
    const rule = RULES[input.name];
    if (!rule) return true;
    const ok = rule(input.value);
    const f = fieldOf(input);
    f.classList.toggle("invalid", !ok);
    f.classList.toggle("valid", ok && showValid);
    input.setAttribute("aria-invalid", String(!ok));
    return ok;
  }

  $$("input, select", form).forEach((input) => {
    if (!RULES[input.name]) return;
    input.addEventListener("blur", () => { if (input.value) check(input, true); });
    input.addEventListener("input", () => { if (fieldOf(input).classList.contains("invalid")) check(input, true); });
  });

  // phone: digits only, formatted as "98765 43210"
  const phone = $("#f-phone");
  phone.addEventListener("input", () => {
    const d = phone.value.replace(/\D/g, "").replace(/^(91|0)(?=\d{10})/, "").slice(0, 10);
    phone.value = d.length > 5 ? d.slice(0, 5) + " " + d.slice(5) : d;
  });

  // funnel: first interaction with the form counts as form_start (once per session)
  form.addEventListener("focusin", () => Store.trackOnce("form_start"), { once: true });

  /* ---------- referral banner + champion college prefill ---------- */
  const attr = Store.attribution();
  if (attr.ref) {
    Store.getDataset({ upToDay: C.demoDay }).then((ds) => {
      const p = Store.findByCode(ds, attr.ref);
      const banner = $("#ref-banner");
      if (p) {
        const who = p.kind === "champion" ? `Campus Champion at ${UI.esc(p.college)}` : `from ${UI.esc(p.college)}`;
        banner.innerHTML = `${UI.avatar(p.name)}<span>🎁 <b>${UI.esc(Store.displayName(p.name))}</b> (${who}) invited you. Register and you both get closer to rewards.</span>`;
        const col = $("#f-college");
        if (p.kind === "champion" && !col.value) col.value = p.college;
      } else {
        banner.innerHTML = `<span>🎁 You were invited with code <b class="mono">${UI.esc(attr.ref)}</b>.</span>`;
      }
      banner.hidden = false;
    });
  }

  /* ---------- submit ---------- */
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const inputs = $$("input[name], select[name]", form).filter((i) => RULES[i.name]);
    const bad = inputs.filter((i) => !check(i, true));
    if (bad.length) {
      bad[0].focus();
      UI.toast("Please fix the highlighted fields", "err");
      return;
    }
    const data = Object.fromEntries(new FormData(form).entries());
    data.waOptIn = !!form.waOptIn.checked;
    const btn = $("#reg-submit");
    btn.disabled = true;
    btn.innerHTML = `<span class="spin-dot"></span> Reserving your seat…`;

    Store.register(data).then((res) => {
      btn.disabled = false;
      btn.innerHTML = "Reserve my free seat →";
      if (res.offline) UI.toast("Saved on this device. The server couldn't be reached.", "err");
      showSuccess(res.registration, { fresh: !res.existing });
      if (res.existing) UI.toast("You're already registered. Here's your invite kit.", "ok", "👋");
      if (window.Landing) Landing.refresh(true);
    });
  });

  /* ---------- success card ---------- */
  function showSuccess(reg, opts) {
    opts = opts || {};
    Store.getDataset({ upToDay: C.demoDay }).then((ds) => {
      const demoCount = ds.registrations.filter((r) => r.demo).length;
      const live = ds.registrations.filter((r) => r.live).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const idx = live.findIndex((r) => r.code === reg.code);
      const seat = demoCount + (idx >= 0 ? idx + 1 : live.length + 1);
      const refs = Store.referralCounts(ds.registrations)[reg.code] || 0;
      render(reg, seat, refs);
      if (opts.fresh) {
        burst();
        $("#register-card").scrollIntoView({ behavior: UI.reduceMotion ? "auto" : "smooth", block: "start" });
      }
    });
  }

  function render(reg, seat, refs) {
    const link = Share.referralLink(reg.code);
    const msg = Share.messages(link);
    const first = UI.esc(String(reg.name).split(" ")[0]);
    const tiers = C.rewards.map((t) => `
      <div class="tier-pill${refs >= t.at ? " done" : ""}">
        <b>${refs >= t.at ? "✅" : t.icon}</b>${t.at} ${t.at === 1 ? "friend" : "friends"}<br><span>${UI.esc(t.title)}</span>
      </div>`).join("");
    const next = C.rewards.find((t) => refs < t.at);

    success.innerHTML = `
      <div class="success-top">
        <div class="success-badge">🎉</div>
        <span class="seat-no">Seat #${UI.fmt(seat)} confirmed</span>
        <h3 class="h-card">You're in, ${first}!</h3>
        <p class="muted small">The joining link + reminders go to <b class="text-2">+91 ${UI.esc(String(reg.phone || "").replace(/(\d{5})(\d{5})/, "$1 $2"))}</b>${reg.email ? ` and <b class="text-2">${UI.esc(reg.email)}</b>` : ""}.</p>
      </div>

      <div class="success-block">
        <span class="label">🎁 Your personal invite link · code <b class="mono c-lime">${UI.esc(reg.code)}</b></span>
        <div class="copy-field"><code>${UI.esc(link)}</code><button type="button" class="btn btn-ghost btn-sm" data-copy>Copy</button></div>
      </div>

      <div class="success-block">
        <span class="label">Share with your batch in one tap</span>
        <div class="share-grid">
          <a class="btn btn-wa" target="_blank" rel="noopener" href="${Share.wa(msg.en)}" data-share="wa-en">WhatsApp · English</a>
          <a class="btn btn-wa" target="_blank" rel="noopener" href="${Share.wa(msg.te)}" data-share="wa-te">WhatsApp · తెలుగు</a>
          <a class="btn btn-ghost" target="_blank" rel="noopener" href="${Share.wa(msg.hi)}" data-share="wa-hi">WhatsApp · Hinglish</a>
          <a class="btn btn-ghost" target="_blank" rel="noopener" href="${Share.linkedin(link)}" data-share="linkedin">LinkedIn</a>
          ${navigator.share ? `<button type="button" class="btn btn-ghost span-2" data-native>More apps…</button>` : ""}
        </div>
      </div>

      <div class="success-block">
        <span class="label">Rewards · <b class="c-lime">${refs}</b> ${refs === 1 ? "friend has" : "friends have"} joined${next ? ` · ${next.at - refs} more for ${UI.esc(next.title)}` : " · all unlocked 🏆"}</span>
        <div class="tier-track">${tiers}</div>
      </div>

      <div class="success-actions">
        <a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="${Share.gcal(link)}">📅 Google Calendar</a>
        <button type="button" class="btn btn-ghost btn-sm" data-ics>⬇ Calendar file (.ics)</button>
        <a class="btn btn-ghost btn-sm" href="referral.html?code=${encodeURIComponent(reg.code)}">Track referrals →</a>
      </div>
      <p class="center"><button type="button" class="tiny muted link-again" data-again>Register another student on this device</button></p>`;

    form.hidden = true;
    success.hidden = false;

    $("[data-copy]", success).addEventListener("click", () => { UI.copy(link, "Invite link"); Store.track("share", { channel: "copy" }); });
    $$("[data-share]", success).forEach((a) => a.addEventListener("click", () => Store.track("share", { channel: a.dataset.share })));
    const nat = $("[data-native]", success);
    if (nat) nat.addEventListener("click", () => Share.native(msg.en, link).then((ok) => ok && Store.track("share", { channel: "native" })));
    $("[data-ics]", success).addEventListener("click", () => Share.downloadICS(link));
    $("[data-again]", success).addEventListener("click", () => {
      success.hidden = true;
      form.hidden = false;
      form.reset();
      $$(".field", form).forEach((f) => f.classList.remove("valid", "invalid"));
      $("#f-name").focus();
    });
  }

  /* ---------- confetti ---------- */
  function burst() {
    if (UI.reduceMotion) return;
    const card = $("#register-card").getBoundingClientRect();
    const canvas = document.createElement("canvas");
    canvas.className = "confetti-canvas";
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    const W = (canvas.width = window.innerWidth);
    const H = (canvas.height = window.innerHeight);
    const ox = card.left + card.width / 2;
    const oy = Math.min(H * 0.6, card.top + 140);
    const colors = ["#8f7dff", "#2fe3f0", "#c3f75c", "#ffb547", "#ff5d8f", "#ffffff"];
    const parts = Array.from({ length: 170 }, () => ({
      x: ox + (Math.random() - 0.5) * 120,
      y: oy,
      vx: (Math.random() - 0.5) * 17,
      vy: -Math.random() * 17 - 5,
      s: 5 + Math.random() * 6,
      r: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.35,
      c: colors[(Math.random() * colors.length) | 0],
      rect: Math.random() < 0.6,
    }));
    let t = 0;
    (function frame() {
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = Math.max(0, 1 - t / 170);
      parts.forEach((p) => {
        p.vy += 0.36;
        p.vx *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        if (p.rect) ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        else { ctx.beginPath(); ctx.arc(0, 0, p.s / 2.6, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      });
      if (++t < 170) requestAnimationFrame(frame);
      else canvas.remove();
    })();
  }

  /* ---------- returning visitor: show their invite kit ---------- */
  const me = Store.myRegistration();
  if (me) showSuccess(me, { fresh: false });
})();

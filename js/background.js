/* =========================================================
   BuildAI·60 — Neural-network background
   Drifting nodes, connecting synapses and "signal" pulses that
   hop from neuron to neuron. Pauses when the tab is hidden.
   ========================================================= */
(function () {
  "use strict";
  var canvas = document.getElementById("bg-canvas");
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext("2d");
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var calm = document.body.getAttribute("data-bg") === "calm";
  var TAU = Math.PI * 2;
  var COLORS = [
    [143, 125, 255], // violet
    [47, 227, 240],  // cyan
    [195, 247, 92],  // lime
  ];

  var W = 0, H = 0, DPR = 1;
  var nodes = [];
  var pulses = [];
  var raf = 0;
  var lastSpawn = 0;
  var mouse = { x: -9999, y: -9999, active: false };

  function linkDist() { return Math.min(175, Math.max(110, W / 9)); }

  function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a.toFixed(3) + ")"; }

  function makeNode() {
    var roll = Math.random();
    var col = roll < 0.55 ? COLORS[0] : roll < 0.9 ? COLORS[1] : COLORS[2];
    var speed = 0.1 + Math.random() * 0.22;
    var ang = Math.random() * TAU;
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      r: 0.9 + Math.random() * 1.6,
      col: col,
      tw: Math.random() * TAU,
      flash: 0,
    };
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 1.75);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var target = Math.round(Math.min(calm ? 60 : 110, (W * H) / (calm ? 22000 : 12500)));
    target = Math.max(target, 18);
    while (nodes.length < target) nodes.push(makeNode());
    if (nodes.length > target) nodes.length = target;
    pulses = pulses.filter(function (p) { return p.a < nodes.length && p.b < nodes.length; });
  }

  function spawnPulse(from, hops) {
    var a = nodes[from];
    if (!a) return;
    var L = linkDist(), L2 = L * L, near = [];
    for (var j = 0; j < nodes.length; j++) {
      if (j === from) continue;
      var dx = a.x - nodes[j].x, dy = a.y - nodes[j].y;
      if (dx * dx + dy * dy < L2) near.push(j);
    }
    if (!near.length) return;
    pulses.push({
      a: from,
      b: near[(Math.random() * near.length) | 0],
      t: 0,
      speed: 0.011 + Math.random() * 0.012,
      hops: hops,
      col: a.col,
    });
  }

  function frame(now) {
    ctx.clearRect(0, 0, W, H);
    var L = linkDist(), L2 = L * L;
    var lineAlpha = calm ? 0.15 : 0.22;
    var i, j, n, a, b, dx, dy, d2;

    // move
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < -30) n.x = W + 30; else if (n.x > W + 30) n.x = -30;
      if (n.y < -30) n.y = H + 30; else if (n.y > H + 30) n.y = -30;
      if (mouse.active) { // gentle repel bubble around the cursor
        dx = n.x - mouse.x; dy = n.y - mouse.y; d2 = dx * dx + dy * dy;
        if (d2 < 8100 && d2 > 0.01) {
          var f = (1 - Math.sqrt(d2) / 90) * 0.9;
          n.x += (dx / Math.sqrt(d2)) * f;
          n.y += (dy / Math.sqrt(d2)) * f;
        }
      }
    }

    // synapses
    ctx.lineWidth = 1;
    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      for (j = i + 1; j < nodes.length; j++) {
        b = nodes[j];
        dx = a.x - b.x; dy = a.y - b.y; d2 = dx * dx + dy * dy;
        if (d2 < L2) {
          ctx.strokeStyle = rgba(a.col, (1 - d2 / L2) * lineAlpha);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // cursor links
    if (mouse.active) {
      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        dx = n.x - mouse.x; dy = n.y - mouse.y; d2 = dx * dx + dy * dy;
        if (d2 < 40000) {
          ctx.strokeStyle = rgba(COLORS[1], (1 - Math.sqrt(d2) / 200) * 0.45);
          ctx.beginPath();
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(n.x, n.y);
          ctx.stroke();
        }
      }
    }

    // neurons
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      n.tw += 0.025;
      var glow = 0.55 + Math.sin(n.tw) * 0.35;
      ctx.fillStyle = rgba(n.col, 0.45 + glow * 0.45);
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, TAU);
      ctx.fill();
      if (n.flash > 0) {
        ctx.strokeStyle = rgba(n.col, n.flash * 0.7);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + (1 - n.flash) * 16, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = rgba(n.col, n.flash * 0.9);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 1.2, 0, TAU);
        ctx.fill();
        n.flash -= 0.025;
        ctx.lineWidth = 1;
      }
    }

    // signal pulses
    if (!reduceMotion) {
      if (now - lastSpawn > (calm ? 1100 : 450) && pulses.length < (calm ? 6 : 14)) {
        lastSpawn = now;
        spawnPulse((Math.random() * nodes.length) | 0, 2 + ((Math.random() * 4) | 0));
      }
      for (i = pulses.length - 1; i >= 0; i--) {
        var p = pulses[i];
        a = nodes[p.a]; b = nodes[p.b];
        if (!a || !b) { pulses.splice(i, 1); continue; }
        p.t = Math.min(1, p.t + p.speed);
        var x = a.x + (b.x - a.x) * p.t, y = a.y + (b.y - a.y) * p.t;
        var tt = Math.max(0, p.t - 0.3);
        var tx = a.x + (b.x - a.x) * tt, ty = a.y + (b.y - a.y) * tt;
        var g = ctx.createLinearGradient(tx, ty, x, y);
        g.addColorStop(0, rgba(p.col, 0));
        g.addColorStop(1, rgba(p.col, 0.95));
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.fillStyle = rgba(p.col, 0.16);
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, TAU);
        ctx.fill();
        ctx.fillStyle = rgba(p.col, 1);
        ctx.beginPath();
        ctx.arc(x, y, 1.9, 0, TAU);
        ctx.fill();
        ctx.lineWidth = 1;
        if (p.t >= 1) {
          pulses.splice(i, 1);
          b.flash = 1;
          if (p.hops > 0) spawnPulse(p.b, p.hops - 1);
        }
      }
    }
  }

  function loop(now) {
    frame(now || 0);
    raf = requestAnimationFrame(loop);
  }

  function start() {
    cancelAnimationFrame(raf);
    if (reduceMotion) { frame(0); return; }
    raf = requestAnimationFrame(loop);
  }

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { resize(); if (reduceMotion) frame(0); }, 120);
  });
  window.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse") return;
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
  }, { passive: true });
  document.addEventListener("pointerleave", function () { mouse.active = false; });
  window.addEventListener("blur", function () { mouse.active = false; });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) cancelAnimationFrame(raf); else start();
  });

  resize();
  start();
})();

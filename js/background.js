/* =========================================================
   BuildAI·60 — Aurora background
   Five large, soft colour blobs drifting on slow independent orbits,
   with a gentle parallax toward the pointer and while scrolling.
   Drawn at 1/3 resolution and upscaled + CSS-blurred, so it stays cheap.
   Pauses when the tab is hidden; one static frame under reduced motion.
   ========================================================= */
(function () {
  "use strict";
  var canvas = document.getElementById("bg-canvas");
  if (!canvas || !canvas.getContext) return;

  var ctx = null;
  try { ctx = canvas.getContext("2d", { alpha: true }); } catch (e) { ctx = null; }
  if (!ctx || typeof ctx.createRadialGradient !== "function") return;

  var root = document.documentElement;
  var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var calm = document.body && document.body.getAttribute("data-bg") === "calm";
  var TAU = Math.PI * 2;
  var SCALE = 1 / 3;          // render resolution relative to CSS size
  var FRAME_MS = 1000 / 30;   // the blobs move slowly; 30 fps is plenty
  var ALPHA = calm ? 0.68 : 0.9;
  var SPEED = calm ? 0.75 : 1;

  // x, y: home position (0-1 of the canvas); ax, ay: orbit size; p: orbit period in seconds;
  // r: radius as a share of the larger side; a: peak alpha; depth: parallax strength.
  var BLOBS = [
    { c: [111, 108, 242], a: 0.38, r: 0.46, x: 0.16, y: 0.14, ax: 0.14, ay: 0.10, p: 52, ph: 0.0, depth: 1.0 },  // indigo
    { c: [255, 143, 94],  a: 0.30, r: 0.38, x: 0.86, y: 0.18, ax: 0.10, ay: 0.13, p: 64, ph: 1.9, depth: 0.7 },  // coral
    { c: [43, 196, 180],  a: 0.26, r: 0.40, x: 0.74, y: 0.86, ax: 0.13, ay: 0.09, p: 46, ph: 3.4, depth: 0.55 }, // teal
    { c: [240, 108, 155], a: 0.25, r: 0.32, x: 0.10, y: 0.80, ax: 0.09, ay: 0.12, p: 70, ph: 4.6, depth: 0.85 }, // rose
    { c: [127, 178, 255], a: 0.32, r: 0.42, x: 0.50, y: 0.46, ax: 0.16, ay: 0.11, p: 38, ph: 2.6, depth: 0.4 },  // sky
  ];

  var W = 1, H = 1;           // backing-store size (low-res)
  var raf = 0, last = 0, t0 = 0, elapsed = 0;
  var pointer = { tx: 0, ty: 0, x: 0, y: 0 };   // -0.5..0.5, eased
  var scroll = { t: 0, v: 0 };                  // 0..1 through the page, eased
  var started = false;

  function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a.toFixed(3) + ")"; }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    var cw = rect.width || window.innerWidth || 1;
    var ch = rect.height || window.innerHeight || 1;
    W = Math.max(1, Math.round(cw * SCALE));
    H = Math.max(1, Math.round(ch * SCALE));
    if (canvas.width !== W) canvas.width = W;
    if (canvas.height !== H) canvas.height = H;
    readScroll();
  }

  function readScroll() {
    var max = Math.max(1, (root.scrollHeight || 0) - (window.innerHeight || 0));
    scroll.t = Math.min(1, Math.max(0, (window.scrollY || window.pageYOffset || 0) / max));
  }

  function draw(sec) {
    ctx.clearRect(0, 0, W, H);
    var big = Math.max(W, H);
    var s = sec * SPEED;
    for (var i = 0; i < BLOBS.length; i++) {
      var b = BLOBS[i];
      var w = (TAU / b.p) * s + b.ph;
      // independent elliptical orbit + a slow breathing radius
      var cx = (b.x + Math.sin(w) * b.ax + Math.sin(w * 0.37 + i) * b.ax * 0.35) * W;
      var cy = (b.y + Math.cos(w * 0.8) * b.ay) * H;
      // parallax: drift away from the pointer and up/down with scroll progress
      cx -= pointer.x * b.depth * W * 0.06;
      cy -= pointer.y * b.depth * H * 0.06;
      cy -= (scroll.v - 0.5) * b.depth * H * 0.28;
      var R = Math.max(1, b.r * big * (1 + Math.sin(w * 1.3 + i * 0.7) * 0.07));
      var a = b.a * ALPHA;
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      g.addColorStop(0, rgba(b.c, a));
      g.addColorStop(0.42, rgba(b.c, a * 0.58));
      g.addColorStop(0.75, rgba(b.c, a * 0.16));
      g.addColorStop(1, rgba(b.c, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    if (!started) {
      started = true;
      root.classList.add("has-aurora");
    }
  }

  function ease() {
    pointer.x += (pointer.tx - pointer.x) * 0.045;
    pointer.y += (pointer.ty - pointer.y) * 0.045;
    scroll.v += (scroll.t - scroll.v) * 0.06;
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (now - last < FRAME_MS) return;
    elapsed += Math.min(now - (last || now), 100); // never jump after a stall
    last = now;
    ease();
    draw(t0 + elapsed / 1000);
  }

  function stop() { cancelAnimationFrame(raf); raf = 0; }

  function start() {
    stop();
    if (reduceMotion) {
      scroll.v = 0.5;
      draw(t0);
      return;
    }
    last = 0;
    raf = requestAnimationFrame(loop);
  }

  // A random starting phase so every page load looks slightly different
  t0 = Math.random() * 600;

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resize();
      if (reduceMotion || document.hidden) draw(t0 + elapsed / 1000);
    }, 140);
  });

  if (!reduceMotion) {
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      pointer.tx = e.clientX / (window.innerWidth || 1) - 0.5;
      pointer.ty = e.clientY / (window.innerHeight || 1) - 0.5;
    }, { passive: true });
    document.addEventListener("pointerleave", function () { pointer.tx = 0; pointer.ty = 0; });
    window.addEventListener("scroll", readScroll, { passive: true });
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else start();
  });

  try {
    resize();
    scroll.v = scroll.t;
    draw(t0);            // paint the first frame immediately (no flash of empty paper)
    if (!document.hidden) start();
  } catch (e) {
    stop();              // never let the decoration break the page
  }
})();

/* =========================================================
   BuildAI·60 — Dependency-free animated charts (SVG + HTML)
   combo (bars + cumulative + pace) · hbars · donut · funnel ·
   ring · sparkline. Each renders to a container's width.
   ========================================================= */
window.Charts = (function () {
  "use strict";
  var esc = UI.esc;

  function niceMax(v) {
    if (v <= 0) return 10;
    var p = Math.pow(10, Math.floor(Math.log10(v)));
    var steps = [1, 2, 2.5, 5, 10];
    for (var i = 0; i < steps.length; i++) if (steps[i] * p >= v) return steps[i] * p;
    return 10 * p;
  }

  /* ---------- tooltip ---------- */
  function tip(container) {
    var t = container.querySelector(".chart-tip");
    if (!t) {
      t = document.createElement("div");
      t.className = "chart-tip";
      container.appendChild(t);
    }
    return {
      show: function (html, x, y) {
        t.innerHTML = html;
        t.classList.add("show");
        var cw = container.clientWidth;
        var tw = t.offsetWidth;
        t.style.left = Math.max(4, Math.min(cw - tw - 4, x - tw / 2)) + "px";
        t.style.top = Math.max(0, y - t.offsetHeight - 12) + "px";
      },
      hide: function () { t.classList.remove("show"); },
    };
  }

  /* ---------- combo: daily bars + cumulative line + target pace ---------- */
  function combo(el, o) {
    var W = Math.max(320, el.clientWidth), H = o.height || 290;
    var pad = { l: 40, r: 48, t: 20, b: 40 };
    var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    var n = o.labels.length;
    var maxBar = niceMax(Math.max.apply(null, o.bars.concat([1])) * 1.15);
    var maxCum = niceMax(Math.max.apply(null, [o.goal * 1.12].concat(o.cumulative, o.target)));
    var slot = iw / n;
    var bw = Math.min(24, slot * 0.5);
    var x = function (i) { return pad.l + slot * (i + 0.5); };
    var yb = function (v) { return pad.t + ih - (v / maxBar) * ih; };
    var yc = function (v) { return pad.t + ih - (v / maxCum) * ih; };
    var from = o.animateFrom == null ? 0 : o.animateFrom;
    var s = [];

    s.push('<svg viewBox="0 0 ' + W + " " + H + '" width="100%" height="' + H + '" role="img" aria-label="' + esc(o.aria || "Sign-ups per day against the pace needed for the target") + '">');
    s.push('<defs>' +
      '<linearGradient id="cbBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6f6cf2"/><stop offset="1" stop-color="#6f6cf2" stop-opacity=".55"/></linearGradient>' +
      '<linearGradient id="cbLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f26a45"/><stop offset="1" stop-color="#e5532f"/></linearGradient>' +
      '<linearGradient id="cbArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6b4a" stop-opacity=".14"/><stop offset="1" stop-color="#ff6b4a" stop-opacity="0"/></linearGradient>' +
      "</defs>");

    // grid + axes
    for (var g = 0; g <= 4; g++) {
      var gy = pad.t + (ih / 4) * g;
      s.push('<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + gy + '" y2="' + gy + '" class="grid-line"/>');
      s.push('<text x="' + (pad.l - 8) + '" y="' + (gy + 4) + '" class="axis" text-anchor="end">' + Math.round(maxBar * (1 - g / 4)) + "</text>");
      s.push('<text x="' + (W - pad.r + 8) + '" y="' + (gy + 4) + '" class="axis axis-r">' + Math.round(maxCum * (1 - g / 4)) + "</text>");
    }

    // goal line
    var gyy = yc(o.goal);
    s.push('<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + gyy + '" y2="' + gyy + '" class="goal-line"/>');
    // narrow slots: drop the number so the label clears the Day 2 value (the right axis still reads 500)
    s.push('<text x="' + (pad.l + 6) + '" y="' + (gyy - 7) + '" class="goal-label">GOAL' + (slot >= 56 ? " " + o.goal : "") + "</text>");

    // bars: 4px rounded cap, square on the baseline
    var base = pad.t + ih;
    o.bars.forEach(function (v, i) {
      if (v == null) return;
      var h = Math.max(2, base - yb(v));
      var bx = x(i) - bw / 2, top = base - h, rr = Math.min(4, h, bw / 2);
      var d = "M" + bx + "," + base + "V" + (top + rr) + "Q" + bx + "," + top + " " + (bx + rr) + "," + top +
        "H" + (bx + bw - rr) + "Q" + (bx + bw) + "," + top + " " + (bx + bw) + "," + (top + rr) + "V" + base + "Z";
      s.push('<path class="bar' + (i >= from ? " grow" : "") + '" style="animation-delay:' + (i - from) * 70 + 'ms" d="' + d + '" fill="url(#cbBar)"/>');
      s.push('<text x="' + x(i) + '" y="' + (pad.t + ih - h - 7) + '" class="bar-val" text-anchor="middle">' + v + "</text>");
    });

    // target pace
    var tp = o.target.map(function (v, i) { return (i ? "L" : "M") + x(i) + "," + yc(v); }).join("");
    s.push('<path d="' + tp + '" class="pace-line"/>');

    // cumulative
    var pts = o.cumulative.map(function (v, i) { return v == null ? null : [x(i), yc(v)]; }).filter(Boolean);
    if (pts.length) {
      var line = pts.map(function (p, i) { return (i ? "L" : "M") + p[0] + "," + p[1]; }).join("");
      var area = line + "L" + pts[pts.length - 1][0] + "," + (pad.t + ih) + "L" + pts[0][0] + "," + (pad.t + ih) + "Z";
      s.push('<path d="' + area + '" fill="url(#cbArea)" class="' + (from === 0 ? "fade-in" : "") + '"/>');
      s.push('<path d="' + line + '" class="cum-line' + (from === 0 ? " draw" : "") + '" pathLength="1"/>');
      var lp = pts[pts.length - 1];
      s.push('<circle cx="' + lp[0] + '" cy="' + lp[1] + '" r="11" class="cum-halo"/>');
      pts.forEach(function (p, i) {
        s.push('<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (i === pts.length - 1 ? 5.5 : 3.5) + '" class="cum-dot' + (i === pts.length - 1 ? " last" : "") + '"/>');
      });
    }

    // x labels
    o.labels.forEach(function (l, i) {
      s.push('<text x="' + x(i) + '" y="' + (H - 20) + '" class="axis x-main" text-anchor="middle">D' + (i + 1) + "</text>");
      if (slot >= 64) s.push('<text x="' + x(i) + '" y="' + (H - 6) + '" class="axis x-sub" text-anchor="middle">' + esc(l) + "</text>");
    });

    // hover columns
    o.labels.forEach(function (l, i) {
      s.push('<rect class="hover-col" data-i="' + i + '" x="' + (x(i) - slot / 2) + '" y="' + pad.t + '" width="' + slot + '" height="' + ih + '"/>');
    });
    s.push("</svg>");
    el.innerHTML = s.join("");

    var t = tip(el);
    Array.prototype.forEach.call(el.querySelectorAll(".hover-col"), function (r) {
      var i = Number(r.getAttribute("data-i"));
      r.addEventListener("pointerenter", function () {
        var v = o.bars[i], c = o.cumulative[i];
        var html = "<b>Day " + (i + 1) + " · " + esc(o.labels[i]) + "</b>" +
          (v == null ? '<span class="muted">This day is still ahead</span><span><i class="k k-pace"></i>Should be at ' + Math.round(o.target[i]) + "</span>" :
            '<span><i class="k k-bar"></i>' + v + ' new that day</span><span><i class="k k-cum"></i>' + c + ' so far</span><span><i class="k k-pace"></i>Should be at ' + Math.round(o.target[i]) + "</span>");
        var rect = r.getBoundingClientRect(), box = el.getBoundingClientRect();
        t.show(html, rect.left - box.left + rect.width / 2, (v == null ? yc(o.target[i]) : Math.min(yb(v), yc(c))) * (box.width / W));
      });
      r.addEventListener("pointerleave", t.hide);
    });
  }

  /* ---------- horizontal bars (HTML) ---------- */
  function hbars(el, items, o) {
    o = o || {};
    if (!items.length) { el.innerHTML = '<div class="empty small">No one on the board yet</div>'; return; }
    var max = o.max || Math.max.apply(null, items.map(function (d) { return d.value; }).concat([1]));
    el.innerHTML = '<div class="hbars">' + items.map(function (d, i) {
      return '<div class="hb-row">' +
        '<div class="hb-top"><span class="hb-label">' + (d.html || esc(d.label)) + "</span>" +
        '<span class="hb-val">' + (o.format ? o.format(d.value, d) : UI.fmt(d.value)) + "</span></div>" +
        '<div class="hb-track"><div class="hb-fill" style="--w:' + ((d.value / max) * 100).toFixed(1) + "%;--c:" + (d.color || "var(--indigo)") + ";animation-delay:" + i * 60 + 'ms"></div></div>' +
        (d.sub ? '<div class="hb-sub">' + d.sub + "</div>" : "") +
        "</div>";
    }).join("") + "</div>";
  }

  /* ---------- donut ---------- */
  function donut(el, items, o) {
    o = o || {};
    var total = items.reduce(function (a, d) { return a + d.value; }, 0);
    var R = 70, SW = 22, C = 2 * Math.PI * R, off = 0;
    var segs = total ? items.filter(function (d) { return d.value > 0; }).map(function (d, i) {
      var len = (d.value / total) * C;
      var seg = '<circle r="' + R + '" cx="90" cy="90" fill="none" stroke="' + d.color + '" stroke-width="' + SW + '" stroke-dasharray="' + Math.max(0, len - 2) + " " + C + '" stroke-dashoffset="' + -off + '" class="donut-seg" style="animation-delay:' + i * 90 + 'ms"><title>' + esc(d.label) + ": " + d.value + "</title></circle>";
      off += len;
      return seg;
    }).join("") : "";
    el.innerHTML =
      '<div class="donut-wrap">' +
        '<svg viewBox="0 0 180 180" class="donut" role="img" aria-label="' + esc(o.aria || "Share of the total by channel") + '">' +
          '<circle r="' + R + '" cx="90" cy="90" fill="none" stroke="rgba(22,20,58,.06)" stroke-width="' + SW + '"/>' +
          '<g transform="rotate(-90 90 90)">' + segs + "</g>" +
          '<text x="90" y="88" text-anchor="middle" class="donut-num">' + esc(o.center || UI.fmt(total)) + "</text>" +
          '<text x="90" y="110" text-anchor="middle" class="donut-lbl">' + esc(o.centerLabel || "total") + "</text>" +
        "</svg>" +
        '<ul class="legend-list">' + items.map(function (d) {
          return '<li><span class="sw" style="background:' + d.color + '"></span><span class="ll">' + esc(d.label) + '</span><b>' + (total ? UI.pct(d.value / total, 0) : "0%") + "</b></li>";
        }).join("") + "</ul>" +
      "</div>";
  }

  /* ---------- funnel ---------- */
  function funnel(el, steps) {
    var top = steps[0] ? steps[0].value || 1 : 1;
    el.innerHTML = '<div class="funnel">' + steps.map(function (s, i) {
      var w = Math.max(8, (s.value / top) * 100);
      var prev = i ? steps[i - 1].value : null;
      var conv = prev ? s.value / prev : null;
      return (i ? '<div class="fn-drop"><span>↓ ' + (prev ? UI.pct(conv, 0) : "–") + ' move on</span>' +
          (prev && conv < 1 ? '<span class="c-red">' + UI.fmt(prev - s.value) + " lost here</span>" : "") + "</div>" : "") +
        '<div class="fn-step"><div class="fn-bar" style="--w:' + w.toFixed(1) + "%;--c:" + s.color + ";animation-delay:" + i * 90 + 'ms"></div>' +
        '<div class="fn-text"><span>' + esc(s.label) + "</span><b>" + UI.fmt(s.value) + "</b></div></div>";
    }).join("") + "</div>";
  }

  /* ---------- progress ring ---------- */
  function ring(el, pct, o) {
    o = o || {};
    var R = 64, C = 2 * Math.PI * R, p = Math.max(0, Math.min(1, pct));
    el.innerHTML =
      '<svg viewBox="0 0 160 160" class="ring" role="img" aria-label="' + Math.round(pct * 100) + '% of the target reached">' +
        // brand gradient: indigo at 12 o'clock, violet down the sides, coral at the bottom (the arc's local x-axis points up)
        '<defs><linearGradient id="ringG" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#3d3bd9"/><stop offset=".5" stop-color="#8b5cf6"/><stop offset="1" stop-color="#ff6b4a"/></linearGradient></defs>' +
        '<circle r="' + R + '" cx="80" cy="80" fill="none" stroke="rgba(22,20,58,.07)" stroke-width="14"/>' +
        '<circle r="' + R + '" cx="80" cy="80" fill="none" stroke="url(#ringG)" stroke-width="14" stroke-linecap="round" transform="rotate(-90 80 80)" ' +
          'stroke-dasharray="' + C + '" stroke-dashoffset="' + C + '" class="ring-arc"/>' +
        '<text x="80" y="80" text-anchor="middle" class="ring-num">' + Math.round(pct * 100) + "%</text>" +
        '<text x="80" y="102" text-anchor="middle" class="ring-lbl">' + esc(o.label || "of target") + "</text>" +
      "</svg>";
    var arc = el.querySelector(".ring-arc");
    arc.getBoundingClientRect(); // commit the start state so the transition runs
    requestAnimationFrame(function () { arc.style.strokeDashoffset = (C * (1 - p)).toFixed(2) + "px"; });
  }

  /* ---------- sparkline ---------- */
  function sparkline(values, color) {
    var W = 120, H = 34, max = Math.max.apply(null, values.concat([1]));
    if (values.length < 2) values = values.concat(values);
    var pts = values.map(function (v, i) { return [(i / (values.length - 1)) * W, H - 3 - (v / max) * (H - 6)]; });
    var d = pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1); }).join("");
    return '<svg class="spark" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="' + d + "L" + W + "," + H + "L0," + H + 'Z" fill="' + color + '" opacity=".1"/>' +
      '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>';
  }

  return { combo: combo, hbars: hbars, donut: donut, funnel: funnel, ring: ring, sparkline: sparkline, niceMax: niceMax };
})();

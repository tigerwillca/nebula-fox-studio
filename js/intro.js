// Nebula Fox Studio: one slow swirl on open, then one big button. Pure canvas.
(function () {
  var box = document.getElementById("nfs-intro");
  if (!box) return;
  var cv = box.querySelector("canvas"), btn = box.querySelector(".nfs-go");
  var ctx = cv.getContext("2d"), dpr = Math.min(window.devicePixelRatio || 1, 2), W, H;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DUR = 3600, cols = [[150,110,255],[90,150,255],[255,120,200]], N = 420, pts = [];
  for (var i = 0; i < N; i++) pts.push({ arm: i % 3, t: Math.random(), j: Math.random() * 0.35 - 0.175, s: 0.6 + Math.random() * 1.6 });
  function size() { W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function ease(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function draw(p) {
    var e = ease(p), cx = W / 2, cy = H * 0.42, R = Math.min(W, H) * 0.36;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#070a1f"; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    var rot = e * Math.PI * 2, open = 0.35 + 0.65 * e, fade = Math.min(1, p * 3);
    for (var k = 0; k < N; k++) {
      var q = pts[k], r = R * open * Math.pow(q.t, 0.7), a = q.arm * 2.0944 + q.t * 4.2 + rot + q.j;
      var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.92, c = cols[q.arm];
      var al = fade * (0.25 + 0.55 * (1 - q.t)), rad = q.s * (2 + 4 * (1 - q.t));
      var g = ctx.createRadialGradient(x, y, 0, x, y, rad * 3);
      g.addColorStop(0, "rgba(" + c + "," + al + ")"); g.addColorStop(1, "rgba(" + c + ",0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad * 3, 0, 6.2832); ctx.fill();
    }
    var core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.5);
    core.addColorStop(0, "rgba(255,240,255," + 0.35 * fade + ")"); core.addColorStop(1, "rgba(150,110,255,0)");
    ctx.fillStyle = core; ctx.beginPath(); ctx.arc(cx, cy, R * 0.5, 0, 6.2832); ctx.fill();
  }
  function settle() { draw(1); btn.classList.add("show"); btn.focus({ preventScroll: true }); }
  size(); addEventListener("resize", function () { size(); if (btn.classList.contains("show")) draw(1); });
  if (reduce) { settle(); } else {
    var t0 = null;
    requestAnimationFrame(function step(t) { if (t0 === null) t0 = t; var p = Math.min(1, (t - t0) / DUR); draw(p); if (p < 1) requestAnimationFrame(step); else settle(); });
  }
  btn.addEventListener("click", function () { box.classList.add("gone"); setTimeout(function () { box.hidden = true; }, reduce ? 0 : 650); });
})();

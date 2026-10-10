/* Nebula Fox Studio: Spark tab. No network, no tracking. Everything stays in this phone's localStorage. */
(function () {
  "use strict";

  var CFG = window.NFS_CONFIG || {};

  // ---------- 30 lines: one per day, walks every line before repeating ----------
  var LINES = [
    "Your wand is ready. So are you.",
    "Brave doesn't mean not nervous. It means you swing anyway.",
    "Every great shot started as a missed one.",
    "Next point, fresh start.",
    "Effort is a kind of magic you can make any time.",
    "You're allowed to be awesome at your own speed.",
    "Curious is a superpower.",
    "Your laugh makes the whole room glow.",
    "Mistakes are just practice in a disguise.",
    "A tiny spark today can be a big light tomorrow.",
    "Eyes on the ball. Heart in the game.",
    "A good heart is the best stat there is.",
    "Try the hard thing. Then be proud you tried.",
    "Being kind is a spell that works every time.",
    "Deep breath. Bounce the ball. You've got this.",
    "Champions are people who kept showing up.",
    "You make the people around you braver.",
    "Even a clever fox started out as a little kit.",
    "Tigers rest too. Resting is part of being strong.",
    "There's no wrong way to be you.",
    "Asking for help is a pro move.",
    "Win or learn. Both count.",
    "A good teammate is worth a hundred trophies.",
    "Today's best is enough, even if it's small.",
    "You're writing your own story, one day at a time.",
    "Big things start with \"let me try.\"",
    "Shake it off. The next serve is yours.",
    "Somebody is really glad you're you.",
    "Wonder about something today.",
    "Some of your biggest fans cheer from the stands, and from their hearts."
  ];
  if (CFG.extraLine && String(CFG.extraLine).trim()) LINES.push(String(CFG.extraLine).trim());

  // ---------- levels by total days opened (never punishes a missed day) ----------
  // A level every 7 days up to 42 (6 x 7 = 42, the studio's number). Day 42 = Nebula Fox, with a soft glow that stays.
  var LEVELS = [
    { at: 1,   name: "Spark" },
    { at: 7,   name: "Glimmer" },
    { at: 14,  name: "Glow" },
    { at: 21,  name: "Beam" },
    { at: 28,  name: "Comet" },
    { at: 35,  name: "Shooting Star" },
    { at: 42,  name: "Nebula Fox" },
    { at: 84,  name: "Constellation" },
    { at: 126, name: "Galaxy" },
    { at: 168, name: "Wand Master" }
  ];
  var FORTY_TWO = 42;

  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };

  // ---------- storage (fails soft in private mode) ----------
  var KEY = "nfs-spark-v1";
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  function dayStr(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function dayNum(d) { return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000); }

  function levelFor(days) {
    var i = 0;
    for (var k = 0; k < LEVELS.length; k++) if (days >= LEVELS[k].at) i = k;
    return i;
  }

  // ---------- daily visit ----------
  var now = new Date(), today = dayStr(now);
  var y = new Date(now); y.setDate(y.getDate() - 1);
  var state = load();
  var isFirstEver = !state.days;
  var prevLevel = state.days ? levelFor(state.days) : -1;
  var newDay = state.last !== today;
  if (newDay) {
    state.days = (state.days || 0) + 1;
    state.streak = state.last === dayStr(y) ? (state.streak || 0) + 1 : 1;
    state.best = Math.max(state.best || 0, state.streak);
    state.last = today;
    state.casts = state.casts || 0;
    state.castsToday = 0;
    save(state);
  }
  var lvl = levelFor(state.days);

  // ---------- paint UI ----------
  var root = document.documentElement.style;
  if (CFG.accent) root.setProperty("--accent", CFG.accent);
  if (CFG.glow) root.setProperty("--glow", CFG.glow);
  document.title = "Nebula Fox Studio";

  var n = LINES.length, step = 7;
  while (gcd(step, n) !== 1) step++;
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  $("line").textContent = LINES[((dayNum(now) * step) % n + n) % n];

  function paintLevel() {
    var L = LEVELS[lvl], next = LEVELS[lvl + 1];
    $("lvl").textContent = lvl + 1;
    $("lvlname").textContent = L.name;
    var pct = 100;
    if (next) {
      var left = next.at - state.days;
      pct = Math.round(((state.days - L.at) / (next.at - L.at)) * 100);
      $("next").textContent = left + (left === 1 ? " more day" : " more days") + " to " + next.name;
    } else {
      $("next").textContent = "Top level. Legendary.";
    }
    $("bar").setAttribute("aria-valuenow", pct);
    requestAnimationFrame(function () { $("fill").style.width = Math.max(4, pct) + "%"; });
    $("streak").textContent = state.streak > 1 ? "✦ " + state.streak + " days in a row" : (state.days > 1 ? "✦ welcome back" : "✦ day one");
    // the 42 touch: a quiet gold glow on the level card from day 42 on
    var card = document.querySelector(".level");
    if (card) card.classList.toggle("glow42", state.days >= FORTY_TWO);
    paintCasts();
  }
  function paintCasts() {
    var c = state.casts || 0;
    $("casts").textContent = c + (c === 1 ? " spark cast" : " sparks cast");
  }
  paintLevel();

  // ---------- toast ----------
  var toastT;
  function toast(big, small, ms) {
    var t = $("toast");
    t.textContent = big;
    if (small) { var s = document.createElement("small"); s.textContent = small; t.appendChild(s); }
    t.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove("show"); }, ms || 2600);
  }

  // ---------- canvases ----------
  var sky = $("sky"), fx = $("fx");
  var sctx = sky.getContext("2d"), fctx = fx.getContext("2d");
  var W = 0, H = 0, DPR = 1, stars = [];

  function rng(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    [sky, fx].forEach(function (c) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); });
    sctx.setTransform(DPR, 0, 0, DPR, 0, 0); fctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var r = rng(11); stars = [];
    var count = Math.round((W * H) / 2600);
    for (var i = 0; i < count; i++) stars.push({ x: r() * W, y: r() * H, s: 0.4 + r() * 1.3, p: r() * 6.28, sp: 0.4 + r() * 1.2 });
    drawSky(0);
  }

  function nebula() {
    sctx.fillStyle = "#070a1f"; sctx.fillRect(0, 0, W, H);
    var blobs = [
      [0.15, 0.30, 0.65, "rgba(120,60,200,0.35)"],
      [0.85, 0.20, 0.55, "rgba(200,70,160,0.22)"],
      [0.70, 0.62, 0.70, "rgba(40,120,200,0.25)"],
      [0.20, 0.80, 0.55, "rgba(30,170,170,0.16)"],
      [0.55, 0.48, 0.35, "rgba(255,190,110,0.10)"]
    ];
    blobs.forEach(function (b) {
      var R = Math.max(W, H) * b[2];
      var g = sctx.createRadialGradient(b[0] * W, b[1] * H, 0, b[0] * W, b[1] * H, R);
      g.addColorStop(0, b[3]); g.addColorStop(1, "rgba(0,0,0,0)");
      sctx.fillStyle = g; sctx.fillRect(0, 0, W, H);
    });
  }

  function drawSky(t) {
    nebula();
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      var a = reduce.matches ? 0.7 : 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(st.p + t * 0.001 * st.sp));
      sctx.fillStyle = "rgba(255,248,230," + (a * 0.85).toFixed(3) + ")";
      sctx.beginPath(); sctx.arc(st.x, st.y, st.s, 0, 6.283); sctx.fill();
    }
  }

  // ---------- sparks ----------
  var parts = [], glows = [], shapes = [];
  var COLORS = [[255, 210, 122], [255, 240, 200], [255, 160, 90], [140, 145, 255], [120, 220, 230], [235, 140, 255]];

  function star4(ctx, x, y, r, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.beginPath();
    for (var i = 0; i < 8; i++) {
      var ang = i * Math.PI / 4, rr = i % 2 ? r * 0.28 : r;
      ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
    }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  function burst(x, y, power) {
    power = power || 1;
    glows.push({ x: x, y: y, r: 0, max: 90 * power, life: 1 });
    var count = reduce.matches ? 0 : Math.round(46 * power);
    for (var i = 0; i < count; i++) {
      var a = Math.random() * 6.283, sp = (1.2 + Math.random() * 4.2) * power;
      parts.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.2,
        life: 1, decay: 0.008 + Math.random() * 0.014, s: 1 + Math.random() * 3.2,
        c: COLORS[(Math.random() * COLORS.length) | 0], star: Math.random() < 0.28, rot: Math.random() * 6
      });
    }
  }

  // Rare casts draw a little constellation: Reynard the fox or the tiger.
  var FOX = { name: "the fox", pts: [[-.75,-.95],[-.3,-.45],[.3,-.45],[.75,-.95],[.82,-.15],[.92,.2],[.28,.55],[0,.9],[-.28,.55],[-.92,.2],[-.82,-.15]], closed: true, extra: [[-.35,.08],[.35,.08]] };
  var TIGER = (function () {
    var p = [];
    for (var i = 0; i < 12; i++) { var a = i / 12 * 6.283; p.push([Math.cos(a) * .82, Math.sin(a) * .74 + .08]); }
    return { name: "the tiger", pts: p, closed: true, extra: [[-.32,.05],[.32,.05],[0,.38]],
      lines: [[[-.62,-.72],[-.82,-1.0],[-.38,-.62]], [[.62,-.72],[.82,-1.0],[.38,-.62]], [[0,-.62],[0,-.36]], [[-.22,-.6],[-.16,-.4]], [[.22,-.6],[.16,-.4]]] };
  })();

  function constellation(which) {
    var size = Math.min(W, H) * 0.2;
    var cx = W * 0.5, cy = H * 0.42;
    shapes.push({ def: which, cx: cx, cy: cy, size: size, t: 0 });
    toast("✦ You found " + which.name + "!", "a rare spark", 2400);
  }

  function drawShape(sh, dt) {
    sh.t += dt;
    var d = sh.def, p = Math.min(1, sh.t / 1400), fade = sh.t > 2600 ? Math.max(0, 1 - (sh.t - 2600) / 900) : 1;
    if (reduce.matches) p = 1;
    var map = function (q) { return [sh.cx + q[0] * sh.size, sh.cy + q[1] * sh.size]; };
    fctx.save();
    fctx.globalAlpha = fade;
    fctx.strokeStyle = "rgba(255,225,160,.75)"; fctx.lineWidth = 1.4; fctx.shadowColor = "#ffd27a"; fctx.shadowBlur = 10;
    var pts = d.pts.map(map), total = pts.length, upto = p * total;
    fctx.beginPath();
    for (var i = 0; i < total && i <= upto; i++) {
      var a = pts[i], b = pts[(i + 1) % total];
      if (i === 0) fctx.moveTo(a[0], a[1]);
      if (i + 1 < total || d.closed) {
        var f = Math.min(1, upto - i);
        fctx.lineTo(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f);
      }
    }
    fctx.stroke();
    if (p === 1 && d.lines) d.lines.forEach(function (ln) {
      fctx.beginPath(); ln.map(map).forEach(function (q, j) { j ? fctx.lineTo(q[0], q[1]) : fctx.moveTo(q[0], q[1]); }); fctx.stroke();
    });
    fctx.fillStyle = "#fff6dc";
    pts.concat(p === 1 ? d.extra.map(map) : []).forEach(function (q, j) {
      if (j <= upto || p === 1) star4(fctx, q[0], q[1], 4.5, 0.3);
    });
    fctx.restore();
    return fade > 0;
  }

  var last = performance.now();
  function frame(t) {
    var dt = Math.min(50, t - last); last = t;
    if (!reduce.matches) drawSky(t);
    fctx.clearRect(0, 0, W, H);
    fctx.globalCompositeOperation = "lighter";
    for (var g = glows.length - 1; g >= 0; g--) {
      var G = glows[g];
      G.r += (G.max - G.r) * 0.18; G.life -= reduce.matches ? 0.02 : 0.03;
      if (G.life <= 0) { glows.splice(g, 1); continue; }
      var grd = fctx.createRadialGradient(G.x, G.y, 0, G.x, G.y, G.r);
      grd.addColorStop(0, "rgba(255,245,215," + (0.9 * G.life).toFixed(3) + ")");
      grd.addColorStop(0.35, "rgba(255,200,120," + (0.45 * G.life).toFixed(3) + ")");
      grd.addColorStop(1, "rgba(120,110,255,0)");
      fctx.fillStyle = grd; fctx.beginPath(); fctx.arc(G.x, G.y, G.r, 0, 6.283); fctx.fill();
    }
    for (var i = parts.length - 1; i >= 0; i--) {
      var P = parts[i];
      P.x += P.vx; P.y += P.vy; P.vx *= 0.975; P.vy = P.vy * 0.975 + 0.035; P.life -= P.decay; P.rot += 0.05;
      if (P.life <= 0) { parts.splice(i, 1); continue; }
      fctx.fillStyle = "rgba(" + P.c[0] + "," + P.c[1] + "," + P.c[2] + "," + P.life.toFixed(3) + ")";
      if (P.star) star4(fctx, P.x, P.y, P.s * 2.4, P.rot);
      else { fctx.beginPath(); fctx.arc(P.x, P.y, P.s * P.life + 0.3, 0, 6.283); fctx.fill(); }
    }
    fctx.globalCompositeOperation = "source-over";
    for (var k = shapes.length - 1; k >= 0; k--) if (!drawShape(shapes[k], dt)) shapes.splice(k, 1);
    requestAnimationFrame(frame);
  }

  // ---------- sound (off by default, never autoplays) ----------
  var soundOn = false, actx = null;
  try { soundOn = localStorage.getItem("nfs-sound") === "1"; } catch (e) {}
  var soundBtn = $("sound");
  function paintSound() {
    soundBtn.setAttribute("aria-pressed", soundOn ? "true" : "false");
    soundBtn.setAttribute("aria-label", soundOn ? "Sound on" : "Sound off");
  }
  paintSound();
  soundBtn.addEventListener("click", function () {
    soundOn = !soundOn;
    try { localStorage.setItem("nfs-sound", soundOn ? "1" : "0"); } catch (e) {}
    paintSound(); if (soundOn) chime(1);
  });
  function chime(power) {
    if (!soundOn) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var notes = power > 1 ? [784, 988, 1175, 1568] : [1046 + Math.random() * 200, 1568];
      notes.forEach(function (f, i) {
        var o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime + i * 0.07;
        o.type = "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.07, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
        o.connect(g).connect(actx.destination); o.start(t0); o.stop(t0 + 1);
      });
    } catch (e) {}
  }
  function buzz(ms) { if (navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} }

  // ---------- casting ----------
  var wand = $("wand"), hint = $("hint");
  function tipPoint() {
    var r = wand.querySelector(".tip-star").getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  var castsSinceRare = 0, rareFlip = 0;
  function cast(x, y, power) {
    burst(x, y, power);
    chime(power);
    buzz(12);
    wand.classList.remove("zap"); void wand.offsetWidth; wand.classList.add("zap");
    hint.classList.remove("show");
    state.casts = (state.casts || 0) + 1;
    state.castsToday = (state.castsToday || 0) + 1;
    save(state); paintCasts();
    castsSinceRare++;
    // milestone sparks
    if ([10, 50, 100, 250, 500, 1000, 2500, 5000].indexOf(state.casts) !== -1) {
      setTimeout(function () { burst(W / 2, H * 0.42, 2); chime(2); toast(state.casts + " sparks!", "your wand is getting stronger", 2400); }, 250);
      return;
    }
    // a rare constellation, at most once in a while
    if (castsSinceRare >= 6 && Math.random() < 0.16) {
      castsSinceRare = 0;
      constellation((rareFlip++ % 2) ? TIGER : FOX);
    }
  }

  // tap the sky anywhere: a spark flies from the wand tip to your finger
  sky.addEventListener("pointerdown", function (e) {
    var tp = tipPoint();
    if (!reduce.matches) {
      for (var i = 0; i < 10; i++) {
        var f = i / 10;
        parts.push({ x: tp.x + (e.clientX - tp.x) * f, y: tp.y + (e.clientY - tp.y) * f, vx: 0, vy: 0, life: 0.5 + f * 0.5,
          decay: 0.03, s: 1.4, c: COLORS[0], star: false, rot: 0 });
      }
    }
    cast(e.clientX, e.clientY, 0.8);
  });

  // wand: tap = cast from the tip; press and hold = secret
  var holdT = null, held = false, downAt = 0;
  wand.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  wand.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    held = false; downAt = Date.now();
    try { wand.setPointerCapture(e.pointerId); } catch (err) {}
    clearTimeout(holdT);
    holdT = setTimeout(function () { wand.classList.add("charging"); }, 250);
    holdT2 = setTimeout(function () { held = true; wand.classList.remove("charging"); openNote(); }, 1350);
  });
  var holdT2 = null;
  function endPress(e, cancelled) {
    clearTimeout(holdT); clearTimeout(holdT2);
    wand.classList.remove("charging");
    if (!held && !cancelled && Date.now() - downAt < 1350) { var tp = tipPoint(); cast(tp.x, tp.y, 1.15); }
  }
  wand.addEventListener("pointerup", function (e) { endPress(e, false); });
  wand.addEventListener("pointercancel", function (e) { endPress(e, true); });
  wand.addEventListener("keydown", function (e) {
    if (e.key === "d" || e.key === "D") { e.preventDefault(); openNote(); } // keyboard path to the secret, for testing
  });
  // keyboard Enter/Space trigger "click" with detail 0; pointer taps are handled above
  wand.addEventListener("click", function (e) { if (e.detail === 0) { var tp = tipPoint(); cast(tp.x, tp.y, 1.15); } });

  // ---------- the secret note ----------
  var note = $("note"), lastFocus = null;
  function openNote() {
    var body = $("note-body");
    body.textContent = "";
    var txt = (CFG.dadNote || "").trim();
    if (txt) {
      body.textContent = txt;
    } else {
      var ph = document.createElement("div");
      ph.className = "placeholder";
      var s = document.createElement("strong"); s.textContent = "PLACEHOLDER: FOR WILLIAM TO WRITE";
      ph.appendChild(s);
      ph.appendChild(document.createTextNode("Dad's note goes here. William: open js/config.js and put your words in dadNote. Until then, this box is what shows up."));
      body.appendChild(ph);
    }
    if (!reduce.matches) { var tp = tipPoint(); burst(tp.x, tp.y, 1.6); }
    chime(2); buzz([10, 60, 10]);
    lastFocus = document.activeElement;
    note.hidden = false;
    state.foundNote = true; save(state);
    $("note-close").focus();
  }
  function closeNote() { note.hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  $("note-close").addEventListener("click", closeNote);
  note.addEventListener("click", function (e) { if (e.target === note) closeNote(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !note.hidden) closeNote(); });

  // ---------- start ----------
  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);

  setTimeout(function () { hint.classList.add("show"); }, 900);
  if (isFirstEver) {
    setTimeout(function () { toast("Hi! ✦", "your wand is ready", 3000); }, 600);
  } else if (newDay && lvl > prevLevel) {
    setTimeout(function () {
      burst(W / 2, H * 0.42, 2.2); chime(2); buzz([20, 40, 20]);
      toast("Level up! ✦ " + LEVELS[lvl].name, "level " + (lvl + 1), 3200);
    }, 700);
  } else if (newDay && state.streak === FORTY_TWO) {
    setTimeout(function () {
      burst(W / 2, H * 0.42, 2.2); chime(2); buzz([20, 40, 20]);
      toast("42 days in a row ✦", "the fox is proud of you", 3600);
    }, 700);
  } else if (newDay && state.days >= 3 && !state.foundNote && state.days % 4 === 3) {
    // a gentle clue every few days until he finds the secret
    setTimeout(function () { hint.textContent = "psst… some wands like to be held"; hint.classList.add("show"); }, 1600);
  }

})();

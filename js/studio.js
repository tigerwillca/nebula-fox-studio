/* Nebula Fox Studio: Studio tab. Everything stays in this phone's localStorage. */
(function () {
  "use strict";
  var KEY = "nfs-studio-v1";
  var st; try { st = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { st = {}; }
  st.status = st.status || {}; st.steps = st.steps || {};
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

  var FLOW = ["Drafted", "Ready", "Uploaded", "Live"];
  var NEXT = ["Trace it", "Traced", "Scanned", "Ready"];
  Array.prototype.forEach.call(document.querySelectorAll(".status"), function (b) {
    var list = b.dataset.start ? NEXT : FLOW;
    function paint() { var v = st.status[b.dataset.id] || b.textContent.trim(); b.textContent = v; b.dataset.s = v; }
    paint();
    b.addEventListener("click", function () {
      var cur = st.status[b.dataset.id] || b.textContent.trim();
      st.status[b.dataset.id] = list[(list.indexOf(cur) + 1) % list.length]; save(); paint();
    });
  });

  var steps = document.querySelectorAll("#steps li");
  function paintSteps() { Array.prototype.forEach.call(steps, function (li) { li.classList.toggle("done", !!st.steps[li.dataset.n]); }); }
  Array.prototype.forEach.call(steps, function (li) {
    li.addEventListener("click", function () { st.steps[li.dataset.n] = !st.steps[li.dataset.n]; save(); paintSteps(); });
  });
  document.getElementById("resetSteps").addEventListener("click", function () { st.steps = {}; save(); paintSteps(); });
  paintSteps();

  var TEXT = [
    { name: "Create Daily", t: "Create Daily Hand Lettered Brush Script Artist T-Shirt",
      b1: "Hand-lettered \"create daily\" in a loose brush script with a tapered brushstroke underline. A simple, honest reminder to make something every day.",
      b2: "Clean one-color design for artists, painters, sketchbook people, makers, writers and anyone building a creative habit.",
      d: "Original hand-lettered brush script that says \"create daily,\" finished with one tapered brushstroke underline. One color, no clutter: a quiet daily reminder to draw, paint, write or build something. Made for artists, makers and creative people." },
    { name: "The Swirl", t: "Hand Painted Spiral Brush Stroke Minimalist Art T-Shirt",
      b1: "One loose, hand-painted spiral stroke, thick on the outside and tapering into the center, with real dry-brush texture at the edges.",
      b2: "Minimalist one-color art with no words. Pairs with anything, and it suits painters, abstract art fans and anyone who likes simple, bold design.",
      d: "One continuous hand-painted spiral, made with a single brush stroke that starts thick and winds down to a fine point at the center. The rough dry-brush edges keep it feeling handmade. No text, no logos: just a simple, bold mark of motion and focus." },
    { name: "Night Owl", t: "Night Owl Awake When Ideas Are Fine Line Owl Artist Shirt",
      b1: "Fine-line owl face with bright, wide-open eyes and feather detail, plus small lettering that reads \"awake when ideas are.\"",
      b2: "Made for night owls, late-night artists, writers, coders and makers who do their best work after dark. White and warm gold-colored ink on dark shirts.",
      d: "A realistic fine-line owl face drawn with tapered feather strokes. Its eyes have soft gold-colored rays, and the line \"awake when ideas are\" sits underneath. Simple, quiet and a little mysterious, for anyone whose best ideas show up after midnight." }
  ];
  var host = document.getElementById("copies");
  TEXT.forEach(function (x) {
    var det = document.createElement("details");
    var sum = document.createElement("summary"); sum.textContent = x.name; det.appendChild(sum);
    [["Brand", "Nebula Fox Studio"], ["Title", x.t], ["Bullet 1", x.b1], ["Bullet 2", x.b2], ["Description", x.d]].forEach(function (r) {
      var box = document.createElement("div"); box.className = "copy";
      var k = document.createElement("div"); k.className = "k"; k.textContent = r[0];
      var p = document.createElement("p"); p.textContent = r[1];
      var btn = document.createElement("button"); btn.type = "button"; btn.className = "btn"; btn.textContent = "Copy";
      btn.addEventListener("click", function () {
        var done = function () { btn.textContent = "Copied ✦"; btn.classList.add("ok"); setTimeout(function () { btn.textContent = "Copy"; btn.classList.remove("ok"); }, 1600); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(r[1]).then(done, function () {});
      });
      box.appendChild(k); box.appendChild(p); box.appendChild(btn); det.appendChild(box);
    });
    if (x.name === "Night Owl") {
      var n = document.createElement("p"); n.className = "tip"; n.textContent = "Dark-ink (black) listing: leave out the last sentence of Bullet 2."; det.appendChild(n);
    }
    host.appendChild(det);
  });
})();

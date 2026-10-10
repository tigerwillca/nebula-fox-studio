/* Nebula Fox Studio: opening glow (once per launch) + offline worker. No network calls, no tracking. */
(function () {
  var g = document.getElementById("nfs-glow");
  try {
    if (g && !sessionStorage.getItem("nfs-glow")) {
      // on the Spark tab, the light blooms from the wand tip
      document.addEventListener("DOMContentLoaded", function () {
        var tip = document.querySelector("#wand .tip-halo");
        if (tip) { var r = tip.getBoundingClientRect(); if (r.width) {
          g.style.setProperty("--gx", (r.left + r.width / 2) + "px"); g.style.setProperty("--gy", (r.top + r.height / 2) + "px"); } }
      });
      g.classList.add("on"); sessionStorage.setItem("nfs-glow", "1");
      setTimeout(function () { g.remove(); }, 2600); }
    else if (g) g.remove();
  } catch (e) { if (g) g.remove(); }
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }
})();

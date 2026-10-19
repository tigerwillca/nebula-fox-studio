// Nebula Fox Studio: offline cache. Only touches caches named "nfs-*".
// Bump CACHE whenever any file changes so installed phones update.
var CACHE = "nfs-v3";
var FILES = [
  "./",
  "apple-touch-icon.png",
  "css/deals.css",
  "css/shell.css",
  "css/spark.css",
  "css/shop.css",
  "css/studio.css",
  "deals.html",
  "icons/favicon-32.png",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "img/create-daily-b.jpg",
  "img/create-daily.jpg",
  "img/night-owl-b.jpg",
  "img/night-owl.jpg",
  "img/one-line-wand.jpg",
  "img/sleepy-night-fox.jpg",
  "img/the-swirl-b.jpg",
  "img/the-swirl.jpg",
  "index.html",
  "js/config.js",
  "js/deals.js",
  "js/shell.js",
  "js/spark.js",
  "js/studio.js",
  "manifest.webmanifest",
  "shop.html",
  "studio.html"
];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("nfs-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  if (new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
    return hit || fetch(e.request).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); }
      return res;
    }).catch(function () { return caches.match("index.html"); });
  }));
});

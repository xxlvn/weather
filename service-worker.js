const CACHE_NAME = "weather-kz-v2";
const urlsToCache = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./img/weather-icon.png",
  "https://cdn.jsdelivr.net/npm/chart.js",
  "https://unpkg.com/leaflet/dist/leaflet.css",
  "https://unpkg.com/leaflet/dist/leaflet.js"
];

// установка кеша
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("📦 Кеш установлен");
      return cache.addAll(urlsToCache);
    })
  );
});

// активация и очистка старых кешей
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  console.log("🔄 Service Worker активирован");
});

// офлайн-режим
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // если есть кеш — возвращаем
      if (response) return response;
      // иначе пытаемся загрузить с интернета
      return fetch(event.request).catch(() =>
        caches.match("./index.html") // fallback если нет интернета
      );
    })
  );
});

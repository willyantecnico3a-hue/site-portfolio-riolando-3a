const CACHE_NAME = "riolandoconecta-v1";

const ARQUIVOS_CACHE = [
    "/",
    "/index.html",
    "/style.css",
    "/script.js",
    "/admin.html",
    "/admin.css",
    "/admin.js",
    "/agenda.html",
    "/agenda.css",
    "/agenda.js",
    "/manifest.json"
];

self.addEventListener("install", function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(ARQUIVOS_CACHE);
        })
    );
});

self.addEventListener("activate", function (event) {
    event.waitUntil(
        caches.keys().then(function (nomesCaches) {
            return Promise.all(
                nomesCaches.map(function (nomeCache) {
                    if (nomeCache !== CACHE_NAME) {
                        return caches.delete(nomeCache);
                    }
                })
            );
        })
    );
});

self.addEventListener("fetch", function (event) {
    event.respondWith(
        caches.match(event.request).then(function (respostaCache) {
            return respostaCache || fetch(event.request);
        })
    );
});
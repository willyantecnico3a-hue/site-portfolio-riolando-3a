const CACHE_NAME = "riolandoconecta-pwa-v2";

const ARQUIVOS_CACHE = [
    "/",
    "/index.html",
    "/admin.html",
    "/agenda.html",
    "/style.css",
    "/admin.css",
    "/agenda.css",
    "/script.js",
    "/admin.js",
    "/agenda.js",
    "/manifest.json",
    "/assets/icons/icon-192.png",
    "/assets/icons/icon-512.png"
];

self.addEventListener("install", function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(ARQUIVOS_CACHE);
        })
    );

    self.skipWaiting();
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

    self.clients.claim();
});

self.addEventListener("fetch", function (event) {
    event.respondWith(
        caches.match(event.request).then(function (respostaCache) {
            return respostaCache || fetch(event.request);
        })
    );
});

self.addEventListener("push", function (event) {
    let dados = {
        title: "🔔 Agenda Riolando",
        body: "Você tem um compromisso próximo.",
        url: "/agenda.html"
    };

    if (event.data) {
        try {
            dados = event.data.json();
        } catch (erro) {
            dados.body = event.data.text();
        }
    }

    const opcoes = {
        body: dados.body || "Você tem um compromisso próximo.",
        icon: "/assets/icons/icon-192.png",
        badge: "/assets/icons/icon-192.png",
        vibrate: [200, 100, 200, 100, 200],
        data: {
            url: dados.url || "/agenda.html"
        },
        actions: [
            {
                action: "abrir",
                title: "Abrir agenda"
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(
            dados.title || "🔔 Agenda Riolando",
            opcoes
        )
    );
});

self.addEventListener("notificationclick", function (event) {
    event.notification.close();

    const url = event.notification.data && event.notification.data.url
        ? event.notification.data.url
        : "/agenda.html";

    event.waitUntil(
        clients.matchAll({
            type: "window",
            includeUncontrolled: true
        }).then(function (janelas) {
            for (const janela of janelas) {
                if (janela.url.includes(url) && "focus" in janela) {
                    return janela.focus();
                }
            }

            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});
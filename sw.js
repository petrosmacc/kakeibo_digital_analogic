// Nome do cache para controle de versão
const CACHE_NAME = 'kakeibo-cache-v1';

// Lista de arquivos que devem ser cacheados na instalação
const ASSETS_TO_CACHE = [
    '/',
    'index.html',
    'css/estilo.css',
    'js/app.js',
    'js/db.js'
];

// Evento de Instalação: Cria o cache e armazena os arquivos estáticos
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Armazenando arquivos no cache...');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting()) // Força o Service Worker a se tornar ativo imediatamente
    );
});

// Evento de Ativação: Limpa caches antigos para evitar conflitos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('Service Worker: Limpando cache antigo...', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Garante que o SW controle todas as abas abertas imediatamente
    );
});

// Evento Fetch: Estratégia Cache-First (Tenta cache, se não encontrar vai para a rede)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // Se o arquivo estiver no cache, retorna ele
                if (cachedResponse) {
                    return cachedResponse;
                }

                // Caso contrário, busca na rede
                return fetch(event.request).then((networkResponse) => {
                    // Verifica se a resposta é válida antes de colocar no cache
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }

                    // Clona a resposta para armazenar no cache e também retornar ao navegador
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                    return networkResponse;
                }).catch(() => {
                    // Opcional: Retornar uma página offline genérica se a rede falhar e não estiver no cache
                    console.log('Falha ao buscar recurso e sem conexão de rede.');
                });
            })
    );
});

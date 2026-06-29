// Service Worker — App Tia Sú
// Estratégia "rede primeiro" (network-first):
//  - Com internet: sempre baixa a versão mais nova (resolve o problema de não atualizar).
//  - Sem internet: usa a última versão guardada no cache (continua funcionando offline).
// Atualiza sozinho assim que um sw.js novo é detectado.

// >>> Ao subir uma atualização do app, troque a data abaixo para forçar a renovação. <<<
const CACHE = 'tiasu-2026-06-29-cor-ativos';

self.addEventListener('install', (e) => {
  self.skipWaiting(); // ativa a nova versão na hora, sem esperar fechar o app
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // Apaga caches antigos de versões anteriores
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim(); // assume o controle das telas já abertas
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return; // não mexe em envios (POST de sync etc.)
  e.respondWith((async () => {
    try {
      // 1) Tenta a rede primeiro → versão sempre fresca
      const fresh = await fetch(req);
      const cache = await caches.open(CACHE);
      cache.put(req, fresh.clone());
      return fresh;
    } catch (err) {
      // 2) Sem internet → devolve o que tiver guardado
      const cached = await caches.match(req);
      if (cached) return cached;
      throw err;
    }
  })());
});

// Service Worker — App Tia Sú
// Estratégia "rede primeiro" (network-first):
//  - Com internet: sempre baixa a versão mais nova (resolve o problema de não atualizar).
//  - Sem internet: usa a última versão guardada no cache (continua funcionando offline).
// Atualiza sozinho assim que um sw.js novo é detectado.

// >>> Ao subir uma atualização do app, troque a data abaixo para forçar a renovação. <<<
const CACHE = 'tiasu-v14-10-c89';

self.addEventListener('install', (e) => {
  self.skipWaiting(); // ativa a nova versão na hora, sem esperar fechar o app
});

/* o botão Atualizar do app pede para a versão nova assumir na hora */
self.addEventListener('message', (e) => {
  if (e && e.data && e.data.tipo === 'assumir') self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // Apaga caches antigos de versões anteriores
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim(); // assume o controle das telas já abertas
  })());
});

/* A PÁGINA PRECISA VIR DA REDE DE VERDADE (11/10/2026)
   "Clico em atualizar e não atualiza" (Suzana). O service worker já era
   rede-primeiro, mas o `fetch` dele passa pelo CACHE DO NAVEGADOR, e o
   GitHub Pages manda guardar o index.html por alguns minutos. Resultado:
   ele ia à rede e recebia a página velha de volta.
   Para o documento (e só para ele), agora o fetch ignora esse cache. */
const _ehPagina = (req) => {
  if (req.mode === 'navigate') return true;
  try {
    const u = new URL(req.url);
    return u.origin === self.location.origin && /(\/|\.html)$/.test(u.pathname);
  } catch (e) { return false; }
};

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return; // não mexe em envios (POST de sync etc.)
  e.respondWith((async () => {
    try {
      // 1) Tenta a rede primeiro → versão sempre fresca
      const fresh = _ehPagina(req) ? await fetch(req, { cache: 'reload' }) : await fetch(req);
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

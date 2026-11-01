/* Service worker : cache des fichiers statiques de l'application (jamais des appels IA). */
const CACHE = 'ehc-v4'
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png']
// Rempli au build (vite.config.ts) : tous les fichiers de assets/, mis en cache dès l'installation. Vide en développement.
const ASSETS = /*__ASSETS__*/[]

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE.concat(ASSETS))))
})
// La mise à jour attend le choix de l'utilisateur (bouton « Mettre à jour » dans l'application).
self.addEventListener('message', (e) => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting() })
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})
self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // Google, Ollama local, etc. : jamais mis en cache
  e.respondWith(
    // ignoreVary : les fichiers de assets/ sont versionnés par leur nom ; l'en-tête Vary d'un serveur ne doit pas les rendre introuvables hors connexion.
    caches.match(req, { ignoreVary: true }).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        })
        .catch(() => hit || (req.mode === 'navigate' ? caches.match('./index.html', { ignoreVary: true }) : Response.error()))
      return hit || net
    }),
  )
})

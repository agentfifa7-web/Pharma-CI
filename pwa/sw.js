// Service worker PHARMA CI : rend l'application installable et utilisable hors connexion.
// - Pages et données (/data/*.json) : réseau d'abord, copie en cache si pas de connexion
//   ou si le réseau est trop lent (au-delà de SLOW_MS, la copie en cache est servie et le réseau la remplace en arrière-plan).
// - Fichiers de l'application (/assets/*, noms versionnés) : cache d'abord, tous préchargés à l'installation.
// Ce fichier est un modèle : vite.config.ts y injecte la liste des fichiers construits.
const PRECACHE = __PRECACHE__
const CACHE = `pharma-ci-${PRECACHE.version}`
const SCOPE = new URL(self.registration.scope).pathname
const SLOW_MS = 4000

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([SCOPE, ...PRECACHE.files.map((f) => SCOPE + f)])))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin) return

  if (url.pathname.startsWith(`${SCOPE}assets/`)) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => save(req, res))),
    )
    return
  }

  const fallback = async () => (await caches.match(req)) || (req.mode === 'navigate' ? caches.match(SCOPE) : undefined)
  const network = fetch(req).then((res) => save(req, res))
  event.waitUntil(network.catch(() => {}))
  event.respondWith(
    new Promise((resolve) => {
      let done = false
      const finish = (res) => { if (!done && res) { done = true; resolve(res) } }
      // Réseau lent : on sert la copie en cache (si elle existe) sans attendre.
      const timer = setTimeout(() => fallback().then(finish), SLOW_MS)
      network
        .then((res) => { clearTimeout(timer); finish(res) })
        .catch(async () => { clearTimeout(timer); finish((await fallback()) || Response.error()) })
    }),
  )
})

function save(req, res) {
  if (res.ok) {
    const copy = res.clone()
    caches.open(CACHE).then((c) => c.put(req, copy))
  }
  return res
}

// apps/web/public/sw.js
const VERSION = 'pwa-v2'
const STATIC = `evolve-static-${VERSION}`
const DATA = `evolve-data-${VERSION}`
const PRECACHE = ['/offline.html', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (e) => {
  self.skipWaiting()
  e.waitUntil(
    caches
      .open(STATIC)
      .then((c) => c.addAll(PRECACHE))
      .catch(() => {})
  )
})
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
      .catch(() => {})
  )
})
self.addEventListener('message', (e) => {
  if (e.data === 'clear-data-cache') caches.delete(DATA).catch(() => {})
})

// ─── Web Push (PUSH-001, spec §5) ───
// Handlers ajoutés sans modifier la stratégie offline. Payload JSON anonyme :
// { title, body, url, tag } — jamais de PII. `tag` stable par poll → une nouvelle push
// remplace la précédente sur le même vote (anti-spam tray).
self.addEventListener('push', (event) => {
  let payload = { title: 'Evolve Capital', body: '', url: '/dashboard', tag: 'evolve' }
  try {
    if (event.data) payload = { ...payload, ...event.data.json() }
  } catch {
    /* garde les défauts si le corps n'est pas du JSON */
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: payload.tag ?? 'evolve',
      data: { url: payload.url ?? '/dashboard' },
      // actions: Android seulement — V1 si besoin « Voter »
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

const NO_CACHE = (url) =>
  url.pathname.startsWith('/api/auth') ||
  url.pathname.includes('/auth/') ||
  url.searchParams.has('no-store')

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return // never cache mutations
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return // same-origin only
  if (NO_CACHE(url)) return

  // Navigations: network-first → cache → offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches
            .open(STATIC)
            .then((c) => c.put(request, copy))
            .catch(() => {})
          return res
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/offline.html')))
    )
    return
  }

  // Static assets: cache-first
  if (url.pathname.startsWith('/_next/static') || url.pathname.startsWith('/icons')) {
    event.respondWith(
      caches
        .match(request)
        .then(
          (r) =>
            r ||
            fetch(request).then((res) => {
              const copy = res.clone()
              caches
                .open(STATIC)
                .then((c) => c.put(request, copy))
                .catch(() => {})
              return res
            })
        )
        .catch(() => fetch(request))
    )
    return
  }

  // GET API data: stale-while-revalidate, MAIS on respecte `Cache-Control: no-store`.
  // Les routes de données sensibles (portfolio, cotisations, attestation) posent
  // `private, no-store` : elles ne doivent JAMAIS être persistées sur l'appareil. Seules
  // les réponses cachables (ex. /api/dashboard, résumé déjà horodaté) entrent dans DATA.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches
        .open(DATA)
        .then(async (cache) => {
          const cached = await cache.match(request)
          const network = fetch(request)
            .then((res) => {
              const cc = res.headers.get('cache-control') || ''
              if (!/no-store/i.test(cc)) {
                cache.put(request, res.clone()).catch(() => {})
              } else {
                // Réponse non-cachable : on purge toute copie héritée d'une version antérieure.
                cache.delete(request).catch(() => {})
              }
              return res
            })
            .catch(() => cached)
          return cached || network
        })
        .catch(() => fetch(request))
    )
  }
})

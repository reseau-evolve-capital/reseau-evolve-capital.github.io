// apps/web/public/sw.js
const VERSION = 'pwa-v1'
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

  // GET API data: stale-while-revalidate
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches
        .open(DATA)
        .then(async (cache) => {
          const cached = await cache.match(request)
          const network = fetch(request)
            .then((res) => {
              cache.put(request, res.clone()).catch(() => {})
              return res
            })
            .catch(() => cached)
          return cached || network
        })
        .catch(() => fetch(request))
    )
  }
})

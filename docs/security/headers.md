# Headers de sécurité HTTP + Content Security Policy (OPS-004)

> Statut : livré sur `feat/monorepo` pour `apps/web`. Dernier ticket du sprint E-OPS —
> il agrège les surfaces réseau introduites par les autres tickets (Sentry, Cloudflare,
> Supabase) dans une CSP unique.

Tous les headers sont posés par Next.js via `async headers()` dans
[`apps/web/next.config.ts`](../../apps/web/next.config.ts), appliqués à **toutes les
routes** (`source: '/:path*'`). Le middleware (`apps/web/middleware.ts`) n'est PAS touché :
il ne gère que l'authentification, pas les headers (pas de duplication).

## Pourquoi `headers()` et pas le middleware

Le middleware tourne déjà sur chaque requête (auth) mais poser la CSP là imposerait de
la recopier sur chaque `NextResponse` (redirections incluses) et de gérer le cas des
assets exclus du matcher. `headers()` couvre **toutes** les réponses (y compris statiques)
de façon déclarative — c'est l'emplacement canonique pour des headers constants.

## Les headers, un par un

| Header                      | Valeur                                                 | Rationale                                                                                                                                                             |
| --------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Content-Security-Policy`   | voir ci-dessous                                        | Restreint les origines de chargement/connexion → défense en profondeur contre XSS et injections.                                                                      |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload`         | Force HTTPS pendant 1 an, sous-domaines inclus, éligible à la liste de preload des navigateurs. Inoffensif en dev (le mécanisme ne s'applique pas au http localhost). |
| `X-Frame-Options`           | `DENY`                                                 | Anti-clickjacking pour les vieux navigateurs (doublé par `frame-ancestors 'none'` en CSP).                                                                            |
| `X-Content-Type-Options`    | `nosniff`                                              | Empêche le MIME-sniffing (un `.txt` ne sera jamais exécuté comme JS).                                                                                                 |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                      | Envoie l'URL complète en same-origin, seulement l'origine en cross-origin HTTPS, rien en downgrade HTTPS→HTTP.                                                        |
| `Permissions-Policy`        | `camera=(), microphone=(), geolocation=(), payment=()` | Désactive des API navigateur que l'app n'utilise pas (liste vide = interdit à tous).                                                                                  |

## La CSP, directive par directive

CSP de **production** (stricte) :

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com data:;
img-src 'self' data: https:;
connect-src 'self' <SUPABASE_ORIGIN> wss://<SUPABASE_HOST> https://cloudflareinsights.com https://*.ingest.sentry.io;
object-src 'none';
frame-ancestors 'none';
base-uri 'self';
form-action 'self'
```

| Directive         | Sources autorisées                                                                                  | Pourquoi                                                                                                                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default-src`     | `'self'`                                                                                            | Politique par défaut : tout ce qui n'a pas de directive dédiée doit être same-origin.                                                                                                                                     |
| `script-src`      | `'self'`, `'unsafe-inline'`, `https://static.cloudflareinsights.com`                                | App + script anti-flash inline (cf. compromis ci-dessous) + `beacon.min.js` de Cloudflare Web Analytics (OPS-002). **Sentry est bundlé** dans nos chunks `'self'` → pas de source externe à ajouter (vérifié au runtime). |
| `style-src`       | `'self'`, `'unsafe-inline'`, `https://fonts.googleapis.com`                                         | App + styles inline (Next/React injectent du CSS inline) + la feuille CSS Google Fonts chargée par `<link>` dans le `<head>` du layout.                                                                                   |
| `font-src`        | `'self'`, `https://fonts.gstatic.com`, `data:`                                                      | Polices auto-hébergées + fichiers de police Google Fonts (`gstatic`) + polices encodées `data:` éventuelles.                                                                                                              |
| `img-src`         | `'self'`, `data:`, `https:`                                                                         | Images locales + SVG/PNG inline en `data:` + avatars/illustrations HTTPS distants. `https:` large assumé (pas de PII dans une URL d'image).                                                                               |
| `connect-src`     | `'self'` + Supabase (https + wss) + `https://cloudflareinsights.com` + `https://*.ingest.sentry.io` | Toutes les origines `fetch`/`XHR`/WebSocket. Voir la liste détaillée ci-dessous.                                                                                                                                          |
| `object-src`      | `'none'`                                                                                            | Aucun `<object>`/`<embed>`/`<applet>` — vecteur d'attaque classique, jamais utilisé.                                                                                                                                      |
| `frame-ancestors` | `'none'`                                                                                            | L'app ne peut JAMAIS être chargée dans une iframe (anti-clickjacking robuste, remplace `X-Frame-Options`).                                                                                                                |
| `base-uri`        | `'self'`                                                                                            | Empêche un `<base>` injecté de détourner les URLs relatives.                                                                                                                                                              |
| `form-action`     | `'self'`                                                                                            | Les `<form>` ne peuvent soumettre que vers l'origine (anti-exfiltration).                                                                                                                                                 |

### Domaines autorisés dans `connect-src` et pourquoi

| Origine                                             | Directive     | Surface                                                   | Source de vérité                                        |
| --------------------------------------------------- | ------------- | --------------------------------------------------------- | ------------------------------------------------------- |
| `<SUPABASE_ORIGIN>` (ex. `https://xxx.supabase.co`) | `connect-src` | REST / Auth / Storage Supabase (client browser)           | dérivé de `NEXT_PUBLIC_SUPABASE_URL`                    |
| `wss://<SUPABASE_HOST>`                             | `connect-src` | Supabase Realtime (websockets)                            | dérivé de `NEXT_PUBLIC_SUPABASE_URL` (schéma https→wss) |
| `https://cloudflareinsights.com`                    | `connect-src` | Beacon Cloudflare qui POST les métriques (`/cdn-cgi/rum`) | OPS-002, `docs/analytics.md`                            |
| `https://static.cloudflareinsights.com`             | `script-src`  | `beacon.min.js`                                           | OPS-002                                                 |
| `https://*.ingest.sentry.io`                        | `connect-src` | Envoi des events Sentry via le DSN                        | OPS-001, `docs/monitoring/sentry.md`                    |
| `https://fonts.googleapis.com`                      | `style-src`   | Feuille CSS Google Fonts                                  | `apps/web/app/layout.tsx`                               |
| `https://fonts.gstatic.com`                         | `font-src`    | Fichiers de police Google Fonts                           | `apps/web/app/layout.tsx`                               |

**Volontairement ABSENTS du `connect-src` client** : les price providers (Google Apps
Script, Alpha Vantage). Ils sont appelés **server-side** uniquement (`/api/market-prices`),
donc jamais soumis à la CSP du navigateur. Voir `docs/PRICE_PROVIDER.md`.

L'origine Supabase est **dérivée à l'exécution** de `NEXT_PUBLIC_SUPABASE_URL` : on extrait
l'`origin` (https) et on en déduit l'origine `wss://` en remplaçant le schéma. Aucun host
codé en dur — la CSP suit l'environnement. En CI/build (placeholder), une URL malformée est
ignorée silencieusement ; en dev, on retombe sur `http://127.0.0.1:54321` + `ws://…`.

## Différence dev vs prod

Déterminée par `process.env.NODE_ENV === 'development'`. En **développement**, on assouplit
deux directives pour ne pas casser le HMR / React Refresh de Next :

| Ajout en dev                                     | Directive     | Raison                                                                           |
| ------------------------------------------------ | ------------- | -------------------------------------------------------------------------------- |
| `'unsafe-eval'`                                  | `script-src`  | Le runtime HMR de Next évalue du code à la volée.                                |
| `ws://localhost:*`, `http://localhost:*`         | `connect-src` | Le canal de rechargement à chaud + les fetch HMR passent par localhost en clair. |
| `http://127.0.0.1:54321`, `ws://127.0.0.1:54321` | `connect-src` | Stack Supabase CLI locale (REST + Realtime), même si l'URL d'env est absente.    |

En **production**, ces sources ne sont **pas** présentes : pas de `'unsafe-eval'`, pas de
localhost. La CSP est strictement limitée aux domaines listés plus haut.

## Compromis assumé : `'unsafe-inline'` sur `script-src`

Le layout (`apps/web/app/layout.tsx`) injecte un **script anti-flash de thème** via
`dangerouslySetInnerHTML` dans le `<head>`. Il s'exécute avant la peinture pour poser
`data-theme="dark"` sans flash de thème clair. Comme c'est un script inline, `script-src`
doit tolérer `'unsafe-inline'`.

C'est un compromis **pragmatique et documenté** : la surface est minime (un seul script,
sous notre contrôle, pas de données externes). `'unsafe-inline'` affaiblit la protection XSS
sur les scripts inline, mais `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`
et `form-action 'self'` limitent fortement ce qu'un éventuel script injecté pourrait faire.

**Amélioration V1 (non bloquante)** : générer un **nonce per-request** dans le middleware,
le passer au script inline (`nonce={...}`) et remplacer `'unsafe-inline'` par
`'nonce-<valeur>'` dans `script-src`. Cela exige de rendre la CSP dynamique par requête
(via le middleware ou un header posé par page) et de propager le nonce dans le layout —
sur-ingénierie pour la V0, à planifier quand on durcira la posture sécurité.

## Comment ajouter une nouvelle source

1. Identifier la **directive** concernée : un script externe → `script-src` ; un endpoint
   `fetch`/WebSocket → `connect-src` ; une feuille de style → `style-src` ; une police →
   `font-src` ; une image → `img-src`.
2. Vérifier d'abord si l'appel est **server-side** : si oui, **ne rien ajouter** (la CSP du
   navigateur ne s'applique pas).
3. Ajouter l'origine dans la liste correspondante de `buildCsp()` dans
   `apps/web/next.config.ts`. Préférer une origine précise (`https://api.exemple.com`) à un
   wildcard.
4. **Vérifier au runtime** : lancer `pnpm --filter @evolve/web dev`, ouvrir la console, et
   confirmer l'absence de message « Refused to … because it violates the following Content
   Security Policy directive ». Tester en clair ET en sombre.
5. Documenter l'origine dans le tableau « Domaines autorisés » ci-dessus, avec son pourquoi.

## Vérification

```bash
# Headers réels (dev)
curl -sI http://localhost:3001/login | grep -i "content-security-policy\|strict-transport\|x-frame\|x-content-type\|referrer-policy\|permissions-policy"
```

En runtime, la console ne doit afficher **aucune** violation CSP. Les erreurs réseau
(`ERR_CONNECTION_REFUSED` Supabase si la stack locale est down, CORS du beacon Cloudflare en
dev parce que l'origine est `localhost`) ne sont **pas** des violations CSP — la requête part
bien, elle est refusée plus loin dans la pile.

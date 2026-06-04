# NTF-007 — Centre de notifications & Web Push (spec d'architecture V1)

> **Statut : SPEC, non implémentée.** Ce document fixe l'architecture cible pour que le
> design system V0 (toasts + bannières, NTF-006) reste extensible. Aucun code de ce
> document n'est câblé dans l'app : les snippets Service Worker / utils sont fournis à
> titre de **gabarits non actifs**. À implémenter dans un sprint V1 ultérieur.
>
> Dépend de : **NTF-006** (toasts + bannières in-app V0). S'aligne sur les emails
> **NTF-002** (bienvenue), **NTF-003** (erreur de sync), **NTF-005** (attestation mensuelle).

## 1. Vue d'ensemble

Deux briques complémentaires, indépendantes l'une de l'autre, qui se branchent sur
l'existant **sans dépendance SaaS** (pas de OneSignal / Firebase) :

| Brique                         | Rôle                                                              | Persistance                                   | Temps réel                   |
| ------------------------------ | ----------------------------------------------------------------- | --------------------------------------------- | ---------------------------- |
| **A. Centre de notifications** | cloche topbar + dropdown + page « Notifications », état lu/non-lu | table `notifications` (Postgres + RLS)        | abonnement Supabase Realtime |
| **B. Web Push**                | notifications système hors-onglet (navigateur fermé)              | tables `notifications` + `push_subscriptions` | Service Worker W3C + VAPID   |

Le V0 (NTF-006) reste la couche **éphémère** (toasts) + **contextuelle** (bannières).
Le V1 ajoute la couche **persistante** (centre) et **hors-app** (push). Une notification
peut donc emprunter jusqu'à 3 canaux : toast immédiat (si l'onglet est ouvert), entrée
dans le centre (toujours), push système (si l'utilisateur a souscrit).

```
événement métier ──► insert notifications (RLS user) ──► Realtime ──► cloche +1 / toast
                 └─► (si push souscrit) POST /api/push/send ──► web-push ──► SW ──► OS
```

## 2. Brique A — Centre de notifications

### 2.1 Schéma (migration V1, ex. `0XX_notifications.sql`)

```sql
CREATE TYPE notification_type AS ENUM (
  'welcome',              -- aligné NTF-002
  'sync_error',           -- aligné NTF-003 (destiné aux trésoriers)
  'attestation_ready',    -- aligné NTF-005
  'contribution_reminder' -- relance cotisation J-7 (cf. E-COT)
);

CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  club_id    UUID REFERENCES clubs(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  link       TEXT,                       -- route in-app cible (ex. /contributions)
  read_at    TIMESTAMPTZ,                -- NULL = non lu
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_user_unread_idx
  ON notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;                 -- index partiel pour le compteur non-lus
```

> **`ON UPDATE CASCADE`** sur `user_id` : cohérent avec la dette ADM-007 (les `users.id`
> sont re-keyés au 1er login → toute FK vers `users(id)` doit cascader).

### 2.2 RLS (par utilisateur, jamais par club)

```sql
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications: own read"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications: own update (mark read)"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- INSERT : service-role uniquement (les Edge Functions émettent les notifications).
-- Aucune policy INSERT pour le rôle authenticated → un membre ne peut pas s'auto-notifier.
```

### 2.3 Émission

Les **mêmes déclencheurs** que les emails insèrent une ligne `notifications` (mutualisation) :

| Type                    | Émetteur (existant)                             | title / body                                    |
| ----------------------- | ----------------------------------------------- | ----------------------------------------------- |
| `welcome`               | Edge `on-user-first-login` (NTF-002)            | « Bienvenue ! » / oriente vers le dashboard     |
| `sync_error`            | Edge `sync` au catch (NTF-003) — **trésoriers** | « Erreur de synchronisation » / message lisible |
| `attestation_ready`     | Edge `send-monthly-attestations` (NTF-005)      | « Ton attestation de {mois} est disponible »    |
| `contribution_reminder` | cron relance J-7 (E-COT V1)                     | « Cotisation à régler avant le {date} »         |

> Règle : chaque émetteur d'email V0 gagne, en V1, un `insert into notifications` adjacent
> (best-effort, ne bloque pas l'email). Le `link` pointe la route in-app pertinente.

### 2.4 UI (consomme NTF-006 + atomes existants)

- **Cloche** dans `AppTopbar` : icône `Bell` + **badge compteur non-lus** (pastille
  `brand.yellow`, le token de notif déjà documenté dans la design-reference-map).
- **Dropdown** : 8 dernières, séparation lu / non-lu, « Tout marquer comme lu », lien
  « Voir tout » → page `/notifications`.
- **Page `/notifications`** : liste paginée, filtre par type, état `EmptyState` (atome
  existant) si aucune notif.
- **Temps réel** : `supabase.channel('notifications:'+userId).on('postgres_changes', …)`
  → incrémente le compteur + déclenche un **toast** (réutilise `useToast` de NTF-006)
  pour les notifs arrivant onglet ouvert. Respecte `prefers-reduced-motion`.
- **A11y** : compteur annoncé via `aria-live="polite"` ; cloche = bouton nommé
  (`aria-label="Notifications, N non lues"`) ; cible ≥ 44×44 ; focus `shadow-glow`.

## 3. Brique B — Web Push (W3C, VAPID, sans SaaS)

### 3.1 Schéma (migration V1, ex. `0XX_push_subscriptions.sql`)

```sql
CREATE TABLE push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,       -- URL du push service du navigateur
  p256dh     TEXT NOT NULL,              -- clé publique du client (chiffrement)
  auth       TEXT NOT NULL,              -- secret d'authentification du client
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX push_subscriptions_user_idx ON push_subscriptions(user_id);
-- RLS : own read/insert/delete (user_id = auth.uid()) ; envoi côté service-role.
```

### 3.2 Génération des clés VAPID (une fois, hors runtime)

```bash
npx web-push generate-vapid-keys
# → env (NE PAS committer) :
#   VAPID_PUBLIC_KEY   (exposable client : NEXT_PUBLIC_VAPID_PUBLIC_KEY)
#   VAPID_PRIVATE_KEY  (server-only, Edge Function / route /api/push/send)
#   VAPID_SUBJECT      (mailto:support@evolve-capital.fr)
```

### 3.3 Service Worker — gabarit non actif (`apps/web/public/sw.js` en V1)

```js
// GABARIT V1 — NON ACTIF. À placer dans apps/web/public/sw.js et enregistrer en V1.
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Evolve Capital', {
      body: data.body ?? '',
      icon: '/logo.jpg',
      badge: '/badge.png',
      data: { link: data.link ?? '/' },
      tag: data.tag, // dédup (ex. 'attestation_ready:2026-04')
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const link = event.notification.data?.link ?? '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const open = clients.find((c) => c.url.includes(link))
      return open ? open.focus() : self.clients.openWindow(link)
    })
  )
})
```

### 3.4 Souscription client — gabarit non actif (util V1)

```ts
// GABARIT V1 — NON ACTIF. Convertit la clé VAPID publique base64url → Uint8Array,
// enregistre le SW, souscrit au PushManager, persiste dans push_subscriptions.
export async function subscribeToPush(vapidPublicKey: string): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
  const reg = await navigator.serviceWorker.register('/sw.js')
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  })
  // POST { endpoint, keys: { p256dh, auth } } → insert push_subscriptions (RLS own)
}
```

### 3.5 Envoi serveur — `POST /api/push/send` (route Node V1)

- Charge les `push_subscriptions` du `user_id` cible (service-role).
- `web-push` (`setVapidDetails(subject, public, private)`) → `sendNotification(sub, payload)`.
- `payload = { title, body, link, tag }` (mêmes types que `notifications`).
- **Nettoyage** : sur réponse `404`/`410` du push service → supprimer la souscription périmée.
- Déclenché par les mêmes émetteurs que la brique A (best-effort, après l'insert `notifications`).

### 3.6 Déclencheurs push (V1)

- `sync OK` (info, optionnel — opt-in trésorier),
- `attestation_ready` (mensuelle, NTF-005),
- `contribution_reminder` J-7 (E-COT),
- `volatilité > 10 %` sur le portefeuille du club (alerte marché, à cadrer).

## 4. Découpage de livraison V1 (proposé)

1. Migration `notifications` + RLS + émission adjacente dans les Edge Functions existantes.
2. UI centre (cloche + dropdown + `/notifications`) sur Realtime — réutilise `useToast`.
3. Migration `push_subscriptions` + VAPID + SW + souscription opt-in (réglages profil).
4. Route `/api/push/send` + branchement des déclencheurs + nettoyage des souscriptions mortes.

## 5. Invariants à respecter (cohérence repo)

- **Tokens only** (badge cloche = `brand.yellow`, jamais `brand.red` pour un état).
- **RLS partout** : `notifications` et `push_subscriptions` par `user_id = auth.uid()`,
  émission/envoi en service-role uniquement.
- **`ON UPDATE CASCADE`** sur toute FK vers `users(id)` (re-key au login, dette ADM-007).
- **Aucune dépendance SaaS** ; secrets VAPID server-only ; `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
  seul exposé au client.
- **A11y** : `aria-live` sur le compteur, focus visible, cibles ≥ 44 px, `prefers-reduced-motion`.

## 6. Réfs

NTF-006 (toasts/bannières V0) · NTF-002/003/005 (émetteurs) · W3C Push API · MDN Web Push ·
`web-push` (npm) · Supabase Realtime · export « Feedback System » (aperçu « Centre V1 »).

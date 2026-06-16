# Web Push — Notifications système (hors-app) · Spec technique

> **Statut** : draft technique — prêt pour implémentation  
> **Date** : 2026-06-16  
> **Epic** : E-NTF (extension) · ticket implémentation : **PUSH-001**  
> **Dépendances** : PWA-001 ✅ (manifest + `sw.js` + `register-sw.ts`) · Vote anonyme V0 ✅ (bannières in-app, `/votes`, admin publish/close)  
> **Hors scope** : centre de notifs in-app type inbox, emails Brevo vote (V1 spec vote §12), notifications réseau cross-club

---

## 1. Contexte & périmètre

### 1.1 Ce qui existe déjà (in-app — ne pas refaire)

Le module Vote couvre la **découverte in-app** :

| Mécanisme            | Fichier / composant                   | Rôle                                              |
| -------------------- | ------------------------------------- | ------------------------------------------------- |
| Bannières dashboard  | `DashboardPollBanners` + `PollBanner` | Vote ouvert non voté — découverte principale      |
| Pastille menu avatar | `AppTopbar` (`pollsToVote`, dot)      | Indicateur non lu                                 |
| Page `/votes`        | `PollsView`, `PollDetailView`         | Accès secondaire + vote + résultats               |
| Admin publish/close  | `admin/votes/actions.ts`              | `status: open` / `closed`                         |
| Toggle staff         | `notify_by_email` sur `polls`         | Intent « notifier à la publication » (email = V1) |

**La Web Push complète l'in-app** quand l'utilisateur n'a pas l'app ouverte. Les deux canaux coexistent ; la push ne remplace pas les bannières.

### 1.2 Objectif PUSH-001

Implémenter une **brique Web Push réutilisable** (subscription persistée, envoi server-side, handlers SW) et l'intégrer au **premier cas d'usage : votes**.

### 1.3 Matrice plateforme

| Plateforme                          | Push app fermée ? | Prérequis                                                           |
| ----------------------------------- | ----------------- | ------------------------------------------------------------------- |
| Desktop (Chrome, Edge, Firefox)     | ✅                | Permission navigateur + SW enregistré — **install PWA optionnelle** |
| Android Chrome                      | ✅                | Idem                                                                |
| iOS Safari **sans** écran d'accueil | ❌                | Fallback UX (réutiliser `PwaInstallSheet` / `detectPwaCase`)        |
| iOS PWA installée (`standalone`)    | ✅                | iOS ≥ 16.4                                                          |
| Safari macOS                        | ✅                | macOS ≥ 13                                                          |

Le SW actuel (`apps/web/public/sw.js`, version `pwa-v1`) gère cache/offline uniquement — **aucun handler `push` / `notificationclick`**.

---

## 2. Décisions produit verrouillées

### 2.1 Événements déclencheurs (V0)

| `NotificationEvent.type` | Déclencheur                                                             | Destinataires                                                                            | Copy (FR, anonyme)                                                                     |
| ------------------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `poll.opened`            | Staff **publie** un vote (`status → open`) ET `notify_by_email = true`¹ | Membres **actifs** du `club_id`, abonnés push, préférence `poll_opened` ON               | « Nouveau vote : {title} — répondez avant le {date} » ou sans date si `closes_at` null |
| `poll.closed`            | Clôture **manuelle** ou `close_due_polls()`                             | Idem, préférence `poll_closed` ON                                                        | « Résultats disponibles : {title} »                                                    |
| `poll.reminder`          | pg_cron quotidien, J-1 avant `closes_at`                                | Membres actifs **n'ayant pas voté** (`has_voted = false`), préférence `poll_reminder` ON | « Il vous reste 24 h pour voter : {title} »                                            |

¹ **Sémantique du toggle staff** : le champ DB `notify_by_email` devient sémantiquement **« notifier les membres à l'ouverture »** (push V0 + email V1). Pas de migration de nom en V0 — le hint UI admin est ajusté (« notification push (+ email si configuré) »). Un ticket follow-up pourra renommer en `notify_members`.

### 2.2 Interdits (anonymat)

- **Jamais** de push sur `submit_vote` (vote individuel enregistré).
- **Jamais** de copy du type « X membres ont voté », « Pierre a voté », contenu de réponse, `user_id`, email.
- Payload push : `pollId`, `clubId`, `type`, `url` uniquement — **pas de PII**.

### 2.3 Opt-in

- **Opt-in explicite** : aucune subscription sans action utilisateur (pre-prompt maison → `Notification.requestPermission()` → `pushManager.subscribe()`).
- **Timing du pre-prompt** : première visite dashboard **avec ≥ 1 vote ouvert non voté**, si pas encore abonné sur cet appareil, cooldown 7 jours après « Plus tard » (localStorage, pattern `dismiss-storage.ts`).
- **Réglages** : section « Notifications » sur `/profil` (toggle master + sous-préférences par type).

---

## 3. Architecture — 5 couches

Respecte CLAUDE.md : logique métier `apps/web` + `packages/data` ; présentation pre-prompt → `packages/ui` si réutilisable, sinon `apps/web/components/push/`.

```
┌─────────────────────────────────────────────────────────────────┐
│  Modules métier (votes, futur…)                                  │
│    dispatchNotification({ type, clubId, payload })               │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  Edge Function `dispatch-push` (service_role)                    │
│    résout destinataires · filtre préférences · web-push (VAPID)  │
│    purge subscriptions 410/404 · log agrégé (pas de PII)         │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  Postgres : push_subscriptions + push_preferences                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Client : pre-prompt · subscribe · profil · SW push/click        │
└─────────────────────────────────────────────────────────────────┘
```

### 3.1 Contrat `NotificationEvent` (`packages/types`)

```ts
/** Types d'événements push V0. Extensible sans breaking change. */
export type NotificationEventType = 'poll.opened' | 'poll.closed' | 'poll.reminder' | 'system.test' // bouton « Tester » profil

export type NotificationEvent = {
  type: NotificationEventType
  clubId: string
  payload: {
    pollId?: string
    title: string
    /** ISO — optionnel (rappel / deadline) */
    closesAt?: string | null
  }
}
```

### 3.2 API d'envoi (server-only)

```ts
// packages/data/src/notifications/dispatch.ts
/** Appelé depuis Server Actions, RPC triggers ou Edge Functions internes. */
export async function dispatchNotification(
  supabaseAdmin: SupabaseClient,
  event: NotificationEvent
): Promise<{ sent: number; failed: number; skipped: number }>
```

Implémentation : `supabaseAdmin.functions.invoke('dispatch-push', { body: event })`. **Jamais** depuis le browser.

Templates de copy centralisés dans `packages/data/src/notifications/templates.ts` (FR ; EN follow-up i18n push = V1).

---

## 4. Schéma Supabase (migration `039_push_notifications.sql`)

### 4.1 Table `push_subscriptions`

Une ligne = **un endpoint navigateur** (multi-appareils par user).

```sql
CREATE TABLE public.push_subscriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  user_id      uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  endpoint     text NOT NULL UNIQUE,
  p256dh       text NOT NULL,
  auth         text NOT NULL,

  user_agent   text,
  -- Snapshot pour debug support (« iPhone Safari PWA ») — pas de PII
  platform     text CHECK (platform IN ('desktop','android-chrome','ios-safari','ios-other','standalone','unknown')),

  last_success_at timestamptz,
  last_error_at   timestamptz,
  last_error_code text  -- ex. '410', '404' — jamais le corps de réponse
);

CREATE INDEX push_subscriptions_user_id_idx ON public.push_subscriptions (user_id);
```

### 4.2 Table `push_preferences`

Préférences **par utilisateur** (pas par appareil).

```sql
CREATE TABLE public.push_preferences (
  user_id        uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  updated_at     timestamptz NOT NULL DEFAULT now(),

  enabled        boolean NOT NULL DEFAULT true,
  poll_opened    boolean NOT NULL DEFAULT true,
  poll_closed    boolean NOT NULL DEFAULT true,
  poll_reminder  boolean NOT NULL DEFAULT true
);
```

Ligne créée au **premier subscribe** (`UPSERT` défauts ON).

### 4.3 RLS

```sql
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_preferences ENABLE ROW LEVEL SECURITY;

-- push_subscriptions : le membre gère SES subscriptions uniquement
CREATE POLICY "push_subscriptions: owner select"
  ON public.push_subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "push_subscriptions: owner insert"
  ON public.push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_subscriptions: owner update"
  ON public.push_subscriptions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_subscriptions: owner delete"
  ON public.push_subscriptions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- push_preferences : lecture/écriture propre user
CREATE POLICY "push_preferences: owner all"
  ON public.push_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_preferences TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
GRANT ALL ON public.push_preferences TO service_role;
```

**Aucune policy** permettant à un membre de lire les subscriptions d'un autre. L'Edge Function utilise `service_role`.

### 4.4 Journal d'envoi (optionnel V0, recommandé)

Table légère `push_delivery_log` pour debug staff réseau — **sans PII** :

```sql
CREATE TABLE public.push_delivery_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  event_type  text NOT NULL,
  club_id     uuid REFERENCES public.clubs (id),
  poll_id     uuid REFERENCES public.polls (id),
  sent_count  int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  skipped_count int NOT NULL DEFAULT 0
);
-- RLS : aucun accès authenticated ; service_role only
```

---

## 5. Service Worker (`public/sw.js`)

Incrémenter `VERSION` → `pwa-v2` (invalidation caches + signal déploiement).

### 5.1 Handler `push`

```js
self.addEventListener('push', (event) => {
  let payload = { title: 'Evolve Capital', body: '', url: '/dashboard', tag: 'evolve' }
  try {
    if (event.data) payload = { ...payload, ...event.data.json() }
  } catch {
    /* garde les défauts */
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
```

### 5.2 Handler `notificationclick`

```js
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
```

### 5.3 Compatibilité cache existant

Conserver intégralement les handlers `install` / `activate` / `fetch` / `message` (PWA-001). Les push handlers s'ajoutent **sans** modifier la stratégie offline.

---

## 6. Client (`apps/web`)

### 6.1 Fichiers à créer

```
apps/web/
├── lib/push/
│   ├── vapid.ts                 # NEXT_PUBLIC_VAPID_PUBLIC_KEY → Uint8Array pour subscribe
│   ├── subscribe.ts             # subscribePush(), unsubscribePush(), getSubscriptionState()
│   ├── permission.ts            # isPushSupported(), canSubscribeOnPlatform() — compose detectPwaCase
│   ├── dismiss-storage.ts       # cooldown pre-prompt (7j) — miroir pattern pwa/dismiss-storage
│   ├── use-push-opt-in.ts       # hook : shouldShowPrePrompt, requestOptIn, dismiss
│   └── platform-push.ts         # map PwaCase → PushPlatformCapability
├── components/push/
│   ├── PushOptInSheet.tsx       # wrapper client autour de composant UI
│   ├── PushOptInMount.tsx       # mount dashboard (à côté InstallBannerMount)
│   └── ProfileNotificationsSection.tsx  # section /profil
├── app/api/push/
│   ├── subscribe/route.ts       # POST — persiste subscription (session requise)
│   └── unsubscribe/route.ts     # POST/DELETE — retire endpoint
└── app/(app)/profil/            # intégrer ProfileNotificationsSection dans ProfileView
```

### 6.2 Fichiers à modifier

| Fichier                            | Changement                                                                                     |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| `public/sw.js`                     | Handlers push + click ; `VERSION = 'pwa-v2'`                                                   |
| `app/(app)/admin/votes/actions.ts` | Après publish réussi → `dispatchNotification({ type: 'poll.opened', … })` si `notify_by_email` |
| `app/(app)/admin/votes/actions.ts` | Après `closePollAction` OK → `dispatchNotification({ type: 'poll.closed', … })`                |
| `app/(app)/dashboard/page.tsx`     | Monter `PushOptInMount`                                                                        |
| `app/(app)/profil/ProfileView.tsx` | Section notifications                                                                          |
| `lib/analytics.ts`                 | Events `push_opt_in_*`, `push_notification_click` (sans PII)                                   |
| `messages/fr.json` + `en.json`     | Namespace `push.*`                                                                             |
| `apps/web/.env.example`            | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`                                                                 |

### 6.3 Flux subscribe

1. `registerServiceWorker()` déjà appelé (`PwaServiceWorkerRegistrar`).
2. Pre-prompt maison (`PushOptInSheet`) → utilisateur accepte.
3. `Notification.requestPermission()` → si `'granted'` :
4. `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`.
5. `POST /api/push/subscribe` avec `{ endpoint, keys: { p256dh, auth }, userAgent, platform }`.
6. Route : vérif session (`getUser()`), `UPSERT push_subscriptions`, `UPSERT push_preferences` défauts.
7. Toast confirmation (Sonner, pattern existant).

**Logout** : appeler `unsubscribe` sur l'endpoint courant + `DELETE` côté API (évite push vers session terminée sur appareil partagé). Réutiliser le hook logout existant dans `AppChrome`.

### 6.4 Capacité plateforme (`canSubscribeOnPlatform`)

```ts
// Règles (ordre)
// 1. !('Notification' in window) || !('PushManager' in window) → unsupported
// 2. detectPwaCase() === 'ios-safari' && !== 'standalone' → needs_pwa_install (fallback iOS)
// 3. detectPwaCase() === 'ios-other' → needs_safari
// 4. permission === 'denied' → blocked
// 5. sinon → ready
```

Le fallback iOS **réutilise** `PwaInstallSheet` + copy push-spécifique (pas de nouveau composant illustration).

### 6.5 Deep links vote

| Event           | `url` dans payload            |
| --------------- | ----------------------------- |
| `poll.opened`   | `/votes/{pollId}`             |
| `poll.closed`   | `/votes/{pollId}` (résultats) |
| `poll.reminder` | `/votes/{pollId}`             |
| `system.test`   | `/dashboard`                  |

---

## 7. Edge Function `dispatch-push`

### 7.1 Fichiers

```
supabase/functions/dispatch-push/
├── index.ts       # entrypoint Deno
├── handler.ts     # pur, testable (résolution destinataires + envoi)
└── handler.test.ts
```

### 7.2 Contrat HTTP

```
POST /functions/v1/dispatch-push
Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>  // ou secret interne DISPATCH_PUSH_SECRET
Body: NotificationEvent (JSON)
→ 200 { sent, failed, skipped }
```

**Ne pas exposer** cette function au client. Seuls Server Actions (service role via `createServiceClient` server-only) et jobs cron l'appellent.

### 7.3 Résolution destinataires

Pseudo-code :

```
switch (event.type):
  poll.opened | poll.closed:
    users = SELECT DISTINCT m.user_id
            FROM memberships m
            WHERE m.club_id = event.clubId AND m.is_active = TRUE

  poll.reminder:
    users = membres actifs du club
            MINUS ceux où has_voted(pollId) = true  -- via requête service_role sur poll_responses

subs = push_subscriptions JOIN push_preferences
       WHERE user_id IN users
         AND push_preferences.enabled
         AND push_preferences.<type_column>
```

Pour `poll.opened` : **ne pas envoyer** si `notify_by_email` false sur le poll (relecture `polls` par `pollId`).

### 7.4 Envoi `web-push`

- Lib : `npm:web-push@^3` (Deno import map).
- Env : `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:support@reseauevolvecapital.com`).
- Payload JSON minimal :

```json
{
  "title": "Evolve Capital",
  "body": "Nouveau vote : …",
  "url": "/votes/uuid",
  "tag": "poll-opened-{pollId}"
}
```

- `tag` stable par poll → une nouvelle push **remplace** la précédente sur le même vote (évite spam tray).
- Sur `410 Gone` / `404` : **DELETE** la subscription invalide.
- Boucle d'envoi : `Promise.allSettled` par batch de 50 (éviter timeout Edge 300s sur gros clubs).

### 7.5 Cron rappel vote

Migration complémentaire — job pg_cron quotidien (ex. 09:00 Europe/Paris) :

```sql
-- Appelle une Edge Function `poll-push-reminders` OU réutilise dispatch-push en boucle
-- Sélection : polls status='open' AND closes_at BETWEEN now() AND now() + interval '24 hours'
```

Implémentation recommandée : Edge Function dédiée `poll-push-reminders` qui query les polls éligibles et appelle le handler `dispatch-push` par poll — **évite** la logique cron dans SQL.

---

## 8. Intégration votes (points d'accroche)

### 8.1 Publication (`createPollAction`)

Après `insert` réussi avec `status === 'open'` :

```ts
if (p.notifyByEmail) {
  await dispatchNotification(adminClient, {
    type: 'poll.opened',
    clubId: ctx.clubId,
    payload: { pollId: data.id, title: p.title, closesAt: toClosesAt(p.closesAt) },
  })
}
```

**Fire-and-forget** : l'échec push ne doit **pas** faire échouer la publication (log Sentry + `push_delivery_log`). Le vote est déjà `open` ; l'in-app couvre le gap.

### 8.2 Clôture manuelle (`closePollAction`)

Après `update` réussi :

```ts
await dispatchNotification(adminClient, {
  type: 'poll.closed',
  clubId: ctx.clubId,
  payload: { pollId, title: /* fetch title */ },
})
```

### 8.3 Clôture auto (`close_due_polls`)

Deux options (choisir **A** en V0) :

- **A** — `close_due_polls` retourne les `id` clôturés ; pg_cron appelle une Edge Function post-close qui dispatch `poll.closed` pour chaque id.
- **B** — trigger SQL `AFTER UPDATE` sur `polls` quand `status` passe à `closed` → `pg_net` vers Edge Function.

**Décision V0 : A** — modifier `close_due_polls()` pour retourner `uuid[]` des polls clôturés ; nouveau job cron `poll-closed-push` toutes les heures (aligné sur `close-due-polls`).

---

## 9. Variables d'environnement

| Variable                       | Scope                                | Description                                          |
| ------------------------------ | ------------------------------------ | ---------------------------------------------------- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | apps/web (public)                    | Clé publique VAPID pour `pushManager.subscribe()`    |
| `VAPID_PUBLIC_KEY`             | supabase/functions                   | Même valeur (vérif web-push)                         |
| `VAPID_PRIVATE_KEY`            | supabase/functions **uniquement**    | Clé privée VAPID — **jamais** client                 |
| `VAPID_SUBJECT`                | supabase/functions                   | `mailto:support@reseauevolvecapital.com`             |
| `DISPATCH_PUSH_SECRET`         | supabase/functions + apps/web server | Secret partagé optionnel si invoke sans service role |

Génération locale :

```bash
npx web-push generate-vapid-keys
```

Documenter dans `REC/ARCHITECTURE.md` §8 et `apps/web/.env.example`.

---

## 10. Sécurité & conformité

- **RLS** sur toutes les tables (§4.3).
- **Service role** uniquement dans Edge Functions et routes API server — jamais `NEXT_PUBLIC_*`.
- Payload push **sans PII** ; logs agrégés uniquement.
- **RGPD** : opt-in explicite ; désabonnement en 1 clic (profil + suppression subscription) ; mention dans politique confidentialité (hors scope dev).
- **Rate limit** : max 1 `system.test` / user / heure (Upstash ou compteur DB).
- **CSP** : `worker-src 'self'` déjà présent (`next.config.ts`) — suffisant.

---

## 11. UI (`packages/ui` — optionnel V0)

Si le pre-prompt est visuellement identique à `PwaInstallSheet`, **réutiliser** `PwaInstallSheet` avec props copy push (pattern PWA-001). Sinon créer `PushOptInSheet` minimal dans `packages/ui` + Storybook play + jest-axe.

La section profil peut rester dans `apps/web` (logique métier + hooks).

**Référence design** : prompt Claude Design (brainstorm rendu) — à lier quand l'export HTML standalone existe.

---

## 12. i18n

- Pre-prompt, profil, toasts : namespace `push` dans `fr.json` / `en.json` (obligatoire projet).
- **Copy des notifications système** : FR uniquement V0 (templates `templates.ts`). EN = V1.

---

## 13. Tests

| Couche             | Fichier / sujet                                                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vitest**         | `templates.test.ts` — copy vote, pas de PII, date FR                                                                                         |
| **Vitest**         | `handler.test.ts` (Edge) — résolution destinataires, filtre prefs, purge 410                                                                 |
| **Vitest**         | `permission.test.ts`, `platform-push.test.ts` — iOS sans standalone → `needs_pwa_install`                                                    |
| **Vitest**         | `subscribe/route.test.ts` — auth requise, upsert                                                                                             |
| **Storybook play** | `PushOptInSheet` — CTA, dismiss, états blocked                                                                                               |
| **jest-axe**       | PushOptInSheet, ProfileNotificationsSection                                                                                                  |
| **E2E Playwright** | `push-opt-in.spec.ts` — **mocker** `Notification` + `PushManager` (pas de vrai tray CI) ; vérifie pre-prompt → subscribe API → profil toggle |
| **E2E**            | Vote publish → mock `dispatch-push` (intercept network) → assert invoke                                                                      |

Ne pas tester le rendu OS natif en E2E — hors contrôle.

---

## 14. Critères d'acceptation (PUSH-001)

- [ ] **Subscription** — membre connecté autorise → subscription persistée Supabase + toast confirmation
- [ ] **Vote ouvert → Push** — staff publie avec toggle notification → membres abonnés reçoivent push **app fermée** (test manuel device réel)
- [ ] **Anonymat** — aucune push sur vote individuel ; copy sans identité votant
- [ ] **iOS fallback** — Safari iOS sans standalone → encart « installez l'app » + lien `PwaInstallSheet`, pas de crash
- [ ] **Réutilisabilité** — `dispatchNotification(event)` utilisable sans config module supplémentaire
- [ ] **Clôture** — push `poll.closed` manuelle + auto
- [ ] **Profil** — toggle désactive envois futurs ; unsubscribe retire l'endpoint
- [ ] **Gate** — `make lint typecheck test` vert ; `cursor-pointer.spec.ts` inchangé

---

## 15. Estimation & découpage tickets

| Ticket    | Scope                                           | Est. |
| --------- | ----------------------------------------------- | ---- |
| PUSH-001a | Migration DB + types + templates                | 2h   |
| PUSH-001b | SW handlers + subscribe API + client lib        | 4h   |
| PUSH-001c | Edge `dispatch-push` + VAPID + tests handler    | 4h   |
| PUSH-001d | UI pre-prompt + profil + i18n                   | 3h   |
| PUSH-001e | Intégration votes (publish/close/reminder cron) | 3h   |
| PUSH-001f | E2E + doc ARCHITECTURE §8                       | 2h   |

**Total ~18h** (1 sprint partiel).

---

## 16. Roadmap

### V0 (ce spec)

- Web Push + votes (opened / closed / reminder J-1)
- Pre-prompt + profil
- iOS fallback PWA

### V1

- Email Brevo vote (toggle existant — canal parallèle)
- Renommer `notify_by_email` → `notify_members`
- Actions Android (« Voter »)
- Copy push i18n EN
- `poll.reminder` J-2 configurable

### V2

- Autres modules (`investor.alert`, `network.news`, sync erreur membre…)
- Centre in-app inbox (historique — distinct du tray OS)

---

## 17. Références code existant

| Sujet                 | Chemin                                                           |
| --------------------- | ---------------------------------------------------------------- |
| SW cache              | `apps/web/public/sw.js`                                          |
| Enregistrement SW     | `apps/web/lib/pwa/register-sw.ts`                                |
| Détection plateforme  | `apps/web/lib/pwa/platform-detection.ts`                         |
| Bannières vote in-app | `apps/web/components/dashboard/DashboardPollBanners.tsx`         |
| Admin publish         | `apps/web/app/(app)/admin/votes/actions.ts`                      |
| Migration polls       | `supabase/migrations/038_polls.sql`                              |
| Pattern Edge Function | `supabase/functions/send-email/`                                 |
| Spec vote             | `docs/superpowers/specs/2026-06-13-vote-anonyme-design.md`       |
| Spec PWA              | `docs/superpowers/specs/2026-06-07-pwa-install-banner-design.md` |

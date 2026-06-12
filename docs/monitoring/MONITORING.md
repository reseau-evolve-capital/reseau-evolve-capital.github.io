# Monitoring — healthcheck sync & notifications Discord

## Architecture

```
pg_cron (2h) → Edge Function sync → clubs.synced_at + sheet_snapshots + club_reporting_daily
                                          │
        RPC health_status() (SECURITY DEFINER, anon)  ← migration 035
                                          │
              GET /api/health (apps/web, public, no-store)
                                          │
   GitHub Actions healthcheck.yml (cron */30 min) ──KO──> Discord (mention @owner)

Vercel deploy Production ──success──> deployment_status → deploy-notify.yml → Discord (embed vert)
```

- **`/api/health`** (`apps/web/app/api/health/route.ts`) : client Supabase **anon** (jamais de
  service role dans apps/web) + RPC `health_status()`. Réponse publique : statuts + horodatages
  uniquement, aucune donnée membre.
  - `200 {status:"ok"}` : sync fraîche (< 180 min) **et** aucune feuille `failed`.
  - `503 {status:"degraded"}` : sync trop vieille ou ≥ 1 feuille en échec.
  - `503 {status:"down"}` : RPC injoignable (message court, jamais de stack).
  - `warnings` : `reporting_stale` si `max(club_reporting_daily.report_date)` > 7 jours —
    **warning seulement**, jamais un critère d'échec (la série REPORTING peut s'arrêter pour
    un problème de **données** côté Sheet, pas un échec de sync — cf. arrêt au 17/04/2026).
- **Pourquoi surveiller la donnée et pas le HTTP de la sync** : l'Edge Function `sync` renvoie
  toujours HTTP 200, même avec `success:false` dans le corps.
- **`healthcheck.yml`** : curl toutes les 30 min ; si HTTP ≠ 200 ou `status ≠ ok` → POST Discord
  avec `<@DISCORD_USER_ID>` (la mention notifie réellement) + embed rouge (raison, extrait JSON,
  lien run GitHub + dashboard Supabase), puis le job **finit en failure** (visible côté GitHub).
  Re-notifie à chaque run tant que c'est cassé (toutes les 30 min) — assumé, pas de déduplication.
- **`deploy-notify.yml`** : sur `deployment_status` (intégration Vercel↔GitHub), si
  `state == 'success'` et environnement contenant `Production` → embed vert (URL du déploiement,
  sha court + branche + message de commit). Pas de mention @ (info, pas alerte).

## Secrets & variables (GitHub → Settings)

| Nom                   | Type     | Usage                                                                                          |
| --------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `DISCORD_WEBHOOK_URL` | secret   | Webhook Discord (healthcheck + deploy-notify). **Jamais en clair.**                            |
| `DISCORD_USER_ID`     | variable | ID Discord mentionné dans les alertes (`<@id>`).                                               |
| `HEALTHCHECK_URL`     | variable | **Optionnelle** — surcharge l'URL par défaut `https://app.reseauevolvecapital.com/api/health`. |

## Tester

```bash
# Local (stack Supabase locale + apps/web sur :3001) :
supabase migration up                       # applique 035 en local
curl -s localhost:3001/api/health | jq      # 200 ok / 503 degraded selon l'état local

# Prod (une fois la migration 035 appliquée) :
curl -s https://app.reseauevolvecapital.com/api/health | jq

# Workflows : onglet Actions → « Healthcheck sync » → Run workflow (workflow_dispatch).
# deploy-notify se teste en observant le prochain deploy Vercel Production.
```

## Limites connues

- Le **cron GitHub Actions peut glisser** de quelques minutes (voire sauter un run en période de
  charge) — fenêtre de fraîcheur (180 min) et fréquence (30 min) dimensionnées en conséquence.
- `reporting_stale` est un **warning** : il n'alerte pas Discord et ne dégrade pas le statut.
- La migration `035_health_status_rpc.sql` doit être **appliquée en prod** pour que `/api/health`
  réponde autre chose que `down`.
- `deploy-notify.yml` suppose l'intégration Vercel↔GitHub active (création des `deployments`
  avec l'environnement « Production »).

Voir aussi : `docs/monitoring/sentry.md` (erreurs runtime).

# Déploiement Supabase PROD — runbook

Projet prod : **`kiwcjtilwihioswdsjjv`** (Dashboard : <https://supabase.com/dashboard/project/kiwcjtilwihioswdsjjv>).

## Quand déployer

Après un merge sur `main` qui touche :

- `supabase/migrations/` → nouvelles migrations à pousser ;
- `supabase/functions/` → Edge Functions à redéployer ;
- la config auth (otp, rate limit, hook email) → étape **manuelle** (cf. plus bas).

## Prérequis

- **Lier le projet** : `supabase link --project-ref kiwcjtilwihioswdsjjv`
  (demande le **mot de passe DB** pour `db push`).
- **PAT** pour la vérif anti-dérive : `export SUPABASE_ACCESS_TOKEN="sbp_…"`
  (Dashboard → Account → Access Tokens).

## Commande de déploiement

```bash
make supabase-deploy-prod CONFIRM=yes
```

Ce qu'elle fait, sur le projet **lié** :

1. `supabase db push` — applique les migrations.
2. `supabase functions deploy --use-api` — déploie **toutes** les fonctions.
   - `--use-api` est **obligatoire** : le bundling local échoue sur les imports
     extensionless en Deno.
   - `verify_jwt` par fonction vient de `supabase/config.toml`
     (`[functions.send-email]` / `[functions.feedback-dispatch]` = `false`, épinglé) —
     un deploy CLI le repose correctement. Un redeploy via le dashboard, lui,
     réinitialise `verify_jwt` à `true` (incident 2026-06-14) → **toujours déployer via la CLI**.

Sans `CONFIRM=yes`, la cible n'exécute rien et affiche un rappel des prérequis.

## Étapes MANUELLES (non automatisées) et pourquoi

### 1. Secrets Edge Functions

```bash
supabase secrets set SEND_EMAIL_HOOK_SECRET=… BREVO_API_KEY=… BREVO_SENDER_EMAIL=… \
  FEEDBACK_AI_PROVIDER=… <clé IA> DISCORD_WEBHOOK_URL=… GITHUB_TOKEN=… NOTION_TOKEN=… …
```

(Liste indicative — voir `supabase/functions/*/` pour le détail par fonction.
`supabase secrets set` exige un PAT `sbp_`.) Non scripté volontairement : ne jamais
committer de valeurs ; le set se fait à la main au moment du rollout.

### 2. Config auth (dashboard uniquement)

À vérifier / poser dans **Auth** :

- `mailer_otp_length = 6` (Auth → Email) ;
- `rate_limit_email_sent ≥ 5` (Auth → Rate Limits) ;
- hook **`send_email` ACTIVÉ** (Auth → Hooks) pointant sur la fonction `send-email`.

**Pourquoi on ne fait JAMAIS `supabase config push` :**
`supabase/config.toml` garde le bloc `[auth.hook.send_email]` **commenté** pour le
dev local (la stack CLI capte tous les emails via Mailpit/Inbucket). Un `config push`
appliquerait ce « commenté » à la prod → **désactiverait le hook send_email** et
**casserait le magic link / l'OTP par email**. Tant que le hook local/prod n'est pas
réconcilié (toggle par env), la config auth reste **gérée à la main dans le dashboard**.

> Config-as-code complète = **tâche FUTURE** : réconcilier le hook send_email
> (local Mailpit vs prod Brevo) via toggling env, AVANT d'activer `supabase config push`.

## Garde anti-dérive (OTP / rate limit)

Parce que la config auth n'est pas poussée en CI, la prod peut **dériver**.
Incident réel : `mailer_otp_length` était passé à **8** (codes OTP à 8 chiffres),
corrigé à 6 via la Management API.

Deux garde-fous :

- **Manuel** : `make supabase-check-prod-auth` (exporter `SUPABASE_ACCESS_TOKEN` d'abord)
  — interroge la Management API et échoue si `otp_length ≠ 6` ou `rate_limit_email_sent < 5`.
- **CI** : job `auth-config` dans `.github/workflows/healthcheck.yml` (toutes les 30 min).
  Skip propre si le secret `SUPABASE_ACCESS_TOKEN` n'est pas posé ; **job rouge = alerte**
  (pas de notif Discord dédiée).
- **Verrou repo** : `apps/web/lib/auth/otp.test.ts` fige le contrat OTP 6 chiffres côté code.

## Rotation des clés

Tout `.env` / PAT exposé (logs, captures, partage) doit être **rotaté** :
régénérer le PAT `sbp_` dans le dashboard, et faire tourner les clés API
(Brevo, IA feedback, Discord/GitHub/Notion) le cas échéant.

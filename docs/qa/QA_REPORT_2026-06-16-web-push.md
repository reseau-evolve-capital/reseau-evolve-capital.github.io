# Rapport QA — Web Push + email de vote (PUSH-001)

**Date :** 2026-06-16 · **Branche :** `feat/anonymous-vote` · **Spec :** `docs/superpowers/specs/2026-06-16-web-push-notifications-design.md` · **Réf design :** `REC/standalone-exports/Notifications - Maquettes (standalone).html`

## Verdict

**PASS.** Conformité visuelle vs maquette **≥ 90 %** sur les deux surfaces in-app comparables (pré-prompt ~93 %, section profil ~90 %). Gate `make lint typecheck test` **exit 0** (utils 62 / data 221 / ui 558 / web 427). Tests Deno Edge 18/18.

## Garantie anti-fuite inter-club (exigence produit)

Les destinataires (push **et** email) sont résolus **uniquement** par le `club_id` du vote (`memberships … club_id = poll.club_id AND status='active'`), jamais via `network_wide`. Défense en profondeur dans `dispatch-push` (re-filtre `allowedUsers` Set). Tests dédiés à 2 clubs prouvent qu'un club B ne reçoit jamais la notif/mail d'un vote du club A :

- `supabase/functions/dispatch-push/__tests__/handler.test.ts` (push)
- `supabase/functions/send-poll-email/__tests__/handler.test.ts` (email)
- `apps/web/app/(app)/admin/votes/actions.test.ts` (le `clubId` dispatché = club du vote)
  Payload push **sans PII** (pollId/clubId/type/url/title) — testé dans `packages/data/src/notifications/templates.test.ts`.

## Couverture par couche

| Couche                | Tests                                                             | Résultat        |
| --------------------- | ----------------------------------------------------------------- | --------------- |
| DB (migration 039)    | RLS owner-only, GRANTs explicites, appliquée local                | OK              |
| Data (`@evolve/data`) | templates (no-PII, date FR) + PollEmail render                    | 24              |
| Edge (Deno)           | dispatch-push 8 · send-poll-email 6 · crons 4                     | 18/18           |
| Web (`@evolve/web`)   | lib/push (permission/platform) + api/push + parité i18n           | inclus dans 427 |
| Intégration vote      | actions.test.ts (publish/close, fire-and-forget, anti-cross-club) | 13              |

## Conformité visuelle (maquette ≥ 90 %)

| Surface           | Avant fix     | Après fix     | Écart résiduel                                                                                          |
| ----------------- | ------------- | ------------- | ------------------------------------------------------------------------------------------------------- |
| Pré-prompt opt-in | 46 %          | **~93 %**     | état « bloqué » in-sheet non rendu (inatteignable : le mount ne s'affiche qu'en `ready`)                |
| Section profil    | 42 %          | **~90 %**     | bouton « Tester une notification » non implémenté (feature distincte `system.test`, voir reste à faire) |
| Toasts            | non mesurable | non mesurable | SW prod-only → toasts non déclenchables en localhost ; à vérifier sur preview HTTPS                     |

Méthode : rendu Playwright (login membre réel + mocks `Notification`/`PushManager`/`serviceWorker.ready`), light + dark + mobile, comparaison composition/tokens vs frames de référence (`docs/audits/shots/ref-push-*.jpeg`). Correctifs **chirurgicaux** (composants push d'`apps/web` + i18n) sans toucher `packages/ui` (`PwaInstallSheet` inchangé → zéro régression de la bannière PWA).

## Reste à faire (owner / suivi)

- **Déploiement requis pour le vrai push** : le Service Worker est prod-only + HTTPS → la souscription ne fonctionne pas en `localhost`. Tester sur preview Vercel + vrai device.
- **Secrets owner** : `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` (Edge), `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (Vercel), `BREVO_API_KEY`/`BREVO_SENDER_EMAIL` (email), secrets Vault `poll_push_reminders_url` + `poll_closed_push_url`. Déployer les 4 Edge Functions.
- **Follow-up V1** : bouton « Tester une notification » (event `system.test` ciblé sur le seul appareil courant + rate-limit), email closed/reminder câblés, copy push i18n EN.

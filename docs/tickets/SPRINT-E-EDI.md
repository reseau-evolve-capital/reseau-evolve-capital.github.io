# Sprint E-EDI · Éditorial & Publication (Newsletter + Blog) — Plan d'orchestration

> Branche : `feat/e-edi-editorial` (depuis `main`, qui **est** le monorepo à jour).
> Lead : orchestrateur. Backlog source : `REC/Phase2_Handoff/backlog/BACKLOG_E-EDI.md`.
> Statut : en cours — Phase 0 OK, exécution ticket par ticket.

## Phase 0 — Écarts backlog ↔ réalité du code (audité 2026-06-07)

Le backlog a été rédigé **sans visibilité sur le repo**. Corrections actées :

| #   | Le backlog supposait                                       | Réalité auditée                                                                                                                           | Décision lead                                                                                                                       |
| --- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | « main = vitrine légacy, monorepo non mergé »              | `main` **est** le monorepo (PR #16 + QA2 + cotisation), `feat/monorepo` est en retard                                                     | Brancher depuis `main`                                                                                                              |
| 2   | Strapi « hors monorepo », à créer                          | Strapi 5 **existe** : `apps/vitrine/content/` (yarn, Node 22, Postgres Docker local :5433)                                                | **EDI-000 : extraire → `apps/cms/`** (autonome, DigitalOcean-ready)                                                                 |
| 3   | Content-type `Article` à créer en dynamic zone             | `article` **existe** (i18n, `content`=blocks natif, relations author/category/tag, SEO inline)                                            | **Évolution additive** : +`type`, +`numeroEdition`, +dynamic zone `corps`. On garde `content` legacy. Zéro perte.                   |
| 4   | Blog `/blog/[slug]` « partiel »                            | **Existe** : `apps/vitrine/src/app/[locale]/blog/[slug]` + liste + `components/blog/*` (BlocksRenderer, BlogCard, AuthorBio, SocialShare) | Réutiliser ; ajouter `BlockRenderer` pour la dynamic zone, sans casser l'existant                                                   |
| 5   | « tokens.css / design-system v4 » côté web                 | Vitrine = **Tailwind v3** (`tailwind.config.ts`), `@strapi/blocks-react-renderer`, **ne consomme pas** `@evolve/*`                        | Renderers web en **Tailwind v3** + mapping tokens marque local                                                                      |
| 6   | `EvolveEmailShell` « prévu »                               | **Existe** : `packages/data/src/emails/_layout/EvolveEmailShell.tsx` + mirror tokens TS `@evolve/design-system`                           | Réutiliser tel quel pour `NewsletterEmail`                                                                                          |
| 7   | API Campagne Brevo à câbler                                | Email actuel = **transactionnel** (Edge Functions Deno + Brevo SMTP). Pas de wrapper campagne                                             | Nouveau wrapper **Campagne** (`/v3/emailCampaigns`) ; admin + render dans **apps/web** (Node, server-only)                          |
| 8   | Route `/blog/[slug]` (sans locale)                         | Route réelle = `[locale]/blog/[slug]` (i18n FR/EN)                                                                                        | Garder le segment `[locale]` ; newsletter = contenu FR                                                                              |
| 9   | `Le Chiffre - Infographies (standalone).html` réf visuelle | **Introuvable** (ni racine, ni `REC/standalone-exports/`)                                                                                 | S'appuyer sur `La Quote-Part - Apercu 3 Rendus (Light) [standalone].html` (racine) ; relancer l'owner si l'infographie est ailleurs |

## Décisions structurantes (validées avec l'owner)

- **EDI-000** extraction Strapi `apps/vitrine/content` → `apps/cms` **maintenant** (ticket préliminaire isolé).
- **Article évolutif** (additif), pas de remplacement de modèle.
- **Pipeline envoi + UI** dans `apps/web` (`/admin/newsletter`), `NewsletterEmail` (React Email) dans `packages/data`.

## Contraintes runtime (vérif & limites)

- Strapi : exige Node 22 (système = v23 → nvm via `make strapi-dev`) **ou** Docker (dispo, up). DB = Postgres Docker local restauré. ⇒ schéma vérifié statiquement + bootstrap ; **runtime Strapi à valider** (owner ou docker).
- Brevo campagne : clé live requise ⇒ tests **API mockée** ; envoi réel = owner.
- Deploy vitrine = **manuel local** (`out/`→`gh-pages`), Strapi up requis ; CI dormant. Pas de deploy dans ce sprint.

## Ordre d'exécution & parallélisme

```
EDI-000 (extraction Strapi)            [solo lead — infra partagée]
   └─► EDI-001 (modèle Strapi)         [contrat de blocs = source de vérité]
         ├─► EDI-002 (preset+seed)
         ├─► EDI-003 (web renderers) ──► EDI-004 (liste+SEO)   [vitrine — parallèle]
         └─► EDI-005 (email renderers) ─► EDI-006 (Brevo+admin) [packages/data + web — parallèle]
                                              └─► EDI-007 (tests + QA finale)
```

- Ressources partagées sérialisées : `Makefile`, `pnpm-workspace.yaml`, barrels (`packages/data/src/emails/index.ts`), Strapi `schema.json`.
- Contrat de blocs (types TS) défini en EDI-001 et **mirroré** des 2 côtés (vitrine ↔ packages/data) ; parité imposée par test runtime (EDI-007 #15).

## Gate « fait » par ticket

Critères d'acceptation + `make lint typecheck test` vert (preuve réelle) + tests de la couche touchée + rendu runtime light/dark (web) + parité contenu web/email + interdits email (#FFF33B, webfont, #E93E3A près d'un chiffre, emoji) + doc à jour. Commits FR atomiques ; push sur demande uniquement.

## Journal des arbitrages

- _(à compléter au fil des tickets)_

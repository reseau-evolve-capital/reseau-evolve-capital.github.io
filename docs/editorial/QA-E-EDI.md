# QA — Sprint E-EDI (éditorial : newsletter + blog)

> Vérification du 2026-06-07, branche `feat/e-edi-editorial`. Verdict global : **PASS**
> (feature livrée, gates verts, rendus runtime conformes). Suivis owner listés en fin.

## Gates automatisés (preuve réelle)

| Gate                                                     | Résultat                                     |
| -------------------------------------------------------- | -------------------------------------------- |
| `pnpm turbo typecheck lint test` (7 packages)            | **13/13 OK**                                 |
| `@evolve/data` test                                      | **180 passed**, 19 skipped (RLS préexistant) |
| `@evolve/web` test                                       | **153 passed**                               |
| Boot Strapi 5.12 (schéma + 11 tables composants + types) | OK                                           |
| Parité i18n fr/en apps/web                               | 537 = 537                                    |

Tests éditoriaux ajoutés : parité contenu web/email (#15) + ordre des rubriques, bloc inconnu sans crash,
le-chiffre fallback, galerie en pile, interdits email (#FFF33B/webfont/emoji/script), gardes routes
newsletter (confirm, brouillon, numeroEdition, idempotence, [TEST], URL article, staff 401/403).

## Vérification runtime (flows)

Stack montée en local : Strapi `:1337` (édition 01 seedée + **publiée**), vitrine dev `:3010`.

| Flow                           | Vérifié                                                                                      | Preuve                           |
| ------------------------------ | -------------------------------------------------------------------------------------------- | -------------------------------- |
| Modèle extensible              | Article créé avec 16 blocs (7 types), API publique le sert (`locale=fr`)                     | DB + `GET /api/articles`         |
| Blog article `/fr/blog/[slug]` | 16 blocs rendus, hero + badge édition, rubriques marqueur doré, citation, CTA jaune          | `edi-blog-article-light.png`     |
| Light/dark (web)               | Image « Le Chiffre » bascule sur sa variante sombre via `<picture>` + `prefers-color-scheme` | `edi-blog-article-dark.png`      |
| Liste `/fr/blog`               | Newsletters + articles mêlés, **badge « La Quote-Part n°1 »**                                | `edi-blog-list.png`              |
| Email newsletter               | Mast + 5 rubriques + citation + fallback Le Chiffre + CTA bulletproof + footer RGPD          | `edi-newsletter-email-light.png` |
| RGAA / axe (article + liste)   | 0 violation **introduite par la feature** (après fix)                                        | axe-core wcag2a/aa               |

Captures dans `docs/audits/shots/` (gitignoré).

## Anomalies trouvées & corrigées en QA

1. **Liste `/blog` plantait** (`searchParams.then` incompatible `output: export`) → filtre serveur
   `?type=newsletter` retiré (un filtre par type serait client-side). `fix(vitrine)`.
2. **Contraste** `LeChiffre` source `text-gray-500` → `text-gray-700` (AA). `fix(vitrine)`.
3. **Seed** : doublons (idempotence cassée) + non publié → `strapi.db.query` + `publish(locale:'fr')`. `fix(cms)`.

## Findings hors scope (préexistants, NON introduits par E-EDI)

- `link-name` ×5 : icônes sociales du **footer vitrine** sans `aria-label` (chrome legacy).
- `color-contrast` ×2 : badge catégorie orange `#F3903F` + lien rouge `#E93E3A` de `BlogCard`/RelatedArticles
  (legacy ; note : `#E93E3A` en lien viole la règle « rouge = branding only » — à corriger hors vitrine-freeze).
- Console : Cloudflare RUM bloqué par CORS sur `localhost` (analytics préexistant).

## Non couvert automatiquement (→ owner / runtime)

- **Envoi Brevo réel** (campagne + test) : testé API mockée uniquement. Requiert `BREVO_API_KEY`,
  `BREVO_MEMBERS_LIST_ID`, `NEWSLETTER_TEST_RECIPIENTS`, sender vérifié SPF/DKIM/DMARC (dette délivrabilité QA2).
- **E2E Playwright `newsletter.spec.ts`** : 2 parcours en `test.skip` tant que le stub Strapi SSR n'est pas
  câblé (la page admin liste les éditions côté serveur Next). Test de montée + axe actifs.
- **Rendu email multi-clients** (Gmail/Outlook/Apple Mail) : à valider via un envoi test réel.
- **Deploy** : vitrine = manuel local `out/`→`gh-pages` (Strapi up requis) ; Strapi `apps/cms` autonome
  déployable sur DigitalOcean (suivi moyen terme).
- **Assets** : visuels « Le Chiffre » réels à produire (`PROMPT_infographie_le_chiffre.md`) + cover édition,
  à uploader dans Strapi (le seed pose des placeholders).

# Rapport d'audit qualité & accessibilité — `apps/web`

> Ticket **OPS-006** (sprint E-OPS). Ce document décrit le **périmètre Lighthouse CI**,
> les seuils retenus et l'état de l'a11y déjà en place. Il est tenu à jour à chaque
> évolution du job Lighthouse.

## 1. Vue d'ensemble — 2 dispositifs complémentaires

L'assurance qualité front d'`apps/web` repose sur deux mécanismes **distincts et déjà
opérationnels** :

| Dispositif                      | Couvre                                    | Où                                                           |
| ------------------------------- | ----------------------------------------- | ------------------------------------------------------------ |
| **A11y automatisée** (existant) | Violations RGAA/WCAG par composant & page | `jest-axe` (packages/ui) + `@axe-core/playwright` (apps/web) |
| **Lighthouse CI** (OPS-006)     | Perf / A11y / Best-Practices / SEO global | `lighthouserc.json` + `.github/workflows/lighthouse.yml`     |

Les deux sont indépendants : Lighthouse **ne remplace pas** les tests axe, il les
complète par une mesure des budgets de performance et des bonnes pratiques globales.

## 2. A11y existante (jest-axe + axe-playwright) — NE PAS RE-CÂBLER

- **`packages/ui`** : ~39 fichiers de tests `jest-axe` (Vitest) sur les atoms / molecules /
  organisms. Chaque composant interactif a son assertion `toHaveNoViolations()`.
- **`apps/web`** : `apps/web/playwright/a11y.spec.ts` exécute `@axe-core/playwright`
  (`AxeBuilder`) sur les pages clés : **`/login`, `/404` (not-found), `/dashboard`,
  `/portfolio`, `/contributions`**. C'est la référence runtime pour l'accessibilité
  des pages, y compris derrière auth (les specs Playwright disposent du contexte de
  session, contrairement à Lighthouse — voir §5).

Ce socle a été livré sur les sprints précédents et **reste la source de vérité a11y**.
Lighthouse CI vient en surcouche sur les pages publiques.

## 3. Périmètre Lighthouse CI — pages publiques d'abord

Décision owner actée : **cibler uniquement les pages publiques sans authentification.**

| URL collectée                                 | Page                               |
| --------------------------------------------- | ---------------------------------- |
| `http://localhost:3001/login`                 | Écran de connexion (split-panel)   |
| `http://localhost:3001/route-inexistante-404` | Page introuvable (`not-found.tsx`) |

Configuration : `numberOfRuns: 2` par URL, `preset: desktop`, `ignoreStatusCode: true`
(nécessaire pour la 404 qui renvoie un HTTP 404 légitime — sans ce flag Lighthouse 12
refuse de charger la page avec `ERRORED_DOCUMENT_REQUEST`).

Les rapports sont écrits en `filesystem` (`./lh-reports`, gitignoré) et **uploadés en
artefact** par le workflow CI (`lighthouse-reports`).

## 4. Seuils retenus & résultats réels (run local 2026-06-05)

Seuils demandés : Performance ≥ 0.80, Accessibility ≥ 0.90, Best-Practices ≥ 0.90,
SEO ≥ 0.90. Scores réels obtenus (`next start` prod build, Chrome desktop) :

| Page     | Performance | Accessibility | Best-Practices | SEO      |
| -------- | ----------- | ------------- | -------------- | -------- |
| `/login` | **0.98**    | **1.00**      | **1.00**       | **1.00** |
| `/404`   | **0.99**    | **1.00**      | **0.96**       | 0.50     |

Tous les seuils passent sur `/login`. Sur la 404, perf / a11y / best-practices passent ;
**seul le SEO est à 0.50 — par construction et à dessein** : une page d'erreur 404
renvoie `noindex` (l'audit `is-crawlable` échoue volontairement) et n'a pas de
meta description ni de contenu indexable. Pénaliser une 404 pour ne pas être
indexable n'a aucun sens.

**Calibration appliquée** : un `assertMatrix` par motif d'URL applique les 4 seuils
stricts à `/login`, et **désactive la seule catégorie SEO sur la 404** (`"categories:seo": "off"`)
tout en conservant perf / a11y / best-practices aux seuils demandés. Aucun seuil
demandé n'a été abaissé ; seul un check intrinsèquement inapplicable à une page
d'erreur a été retiré, et c'est documenté ici.

> Les scores `/login` ont une marge confortable (0.98–1.00). Si un futur changement
> les fait passer juste sous un seuil, le job CI échouera — c'est l'effet voulu.

## 5. Limite assumée — pages authentifiées = V1

Les pages derrière auth (**`/dashboard`, `/portfolio`, `/contributions`, `/admin`**)
**ne sont pas auditées par Lighthouse**. Raisons :

1. Le login se fait par **magic link** (Supabase) — scripter une session Lighthouse
   fiable en CI est fragile et non déterministe.
2. Toute route protégée **redirige vers `/login`** sans session → Lighthouse
   mesurerait la page de login, faussant les scores.

Ces pages **restent couvertes en a11y** par `@axe-core/playwright` (qui, lui, dispose
du contexte de session — cf. `apps/web/playwright/a11y.spec.ts`). L'audit Lighthouse
des pages authentifiées est un **follow-up V1** (nécessiterait un seeding de session
dédié, ex. injection de cookie de session de test).

## 6. Lancer Lighthouse en local

```bash
# 1. Polices (stubs si absentes — licence) + build prod d'apps/web
node scripts/ensure-fonts.mjs
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key \
NEXT_PUBLIC_SITE_URL=https://example.com \
  pnpm turbo build --filter=@evolve/web

# 2. lhci autorun : démarre next start -p 3001, collecte, assert, écrit ./lh-reports
pnpm lighthouse
```

`lhci` gère lui-même le démarrage / arrêt du serveur via `startServerCommand` dans
`lighthouserc.json`. Sur macOS, exporter `CHROME_PATH` si Chrome n'est pas détecté.

## 7. Où trouver les rapports

- **CI** : artefact `lighthouse-reports` du workflow _Lighthouse CI_ (téléchargeable
  depuis l'onglet _Actions_ du run).
- **Local** : `./lh-reports/*.report.html` et `.report.json` (gitignorés).

## 8. Fichiers

- `lighthouserc.json` — config collect + assertMatrix + upload.
- `.github/workflows/lighthouse.yml` — job CI (séparé du job `quality`/`build`).
- `package.json` — devDep `@lhci/cli`, script `pnpm lighthouse`.
- `apps/web/playwright/a11y.spec.ts` — a11y runtime (axe-playwright), inchangé.

# Audit design — préalable au module « Saisie d'opérations & Quotes-parts »

**Date** : 2026-06-24 · **Auteur** : session design · **Cible** : `apps/web` + `packages/{design-system,ui}`
**Objet** : auditer le design system et la navigation réels avant de spécifier les 8 nouveaux écrans du `CAHIER_DES_CHARGES_DESIGN.md`. La spec design qui en découle vit dans [`docs/tickets/PROMPT-DESIGN-OPS-MODULE.md`](../tickets/PROMPT-DESIGN-OPS-MODULE.md).

## Rapport d'audit (synthèse)

1. **Palette** — accent unique `brand-yellow #FDC70C` (+ `accent-ink #231F20`) ; `brand-red #E93E3A` = branding only, **jamais une perte** ; dataviz `positive #0A7A4D` / `negative #C53030` / `neutral #67686A` / `warning #D97706` ; neutres `n-0…n-1000` ; sémantique mappée light/dark via `[data-theme="dark"]`. Source : `packages/design-system/styles/tokens.css`.
2. **Typo** — display `Tommy Soft` (fallback `Plus Jakarta Sans`, 300→900) titres + chiffres-clés ; body `Plus Jakarta Sans` ; mono `IBM Plex Mono` ; montants en `tnum/lnum`, format EUR FR `1 234,56 €` (NBSP), négatif `−` (U+2212).
3. **Rayons / ombres / motion** — `r-sm 6 / r-md 10 / r-lg 14 / pill` ; `shadow-card/pop/modal/glow` ; `150/220/320ms` ; focus = `shadow-glow`.
4. **Composants réutilisables** — `KPICard`, `TrendBadge`, `CurrencyAmount`, `EmptyState`, `FormField`, `SegmentedToggle`, `Stepper`, `SensitiveConfirmModal`, `ContributionStatusCard`, `CotisationMonth`, `AllocationDonut`, `SparklineMini`, `Toast`, `Button` (primary/secondary/ghost/danger). Inventaire : `packages/ui/src/{atoms,molecules,organisms}`.
5. **Nav membre** — `Sidebar` (desktop) + `BottomNav` (mobile) : Dashboard · Portefeuille · Cotisations · Réseau. Déclarée dans `apps/web/components/chrome/AppChrome.tsx` (`sidebarItems` / `bottomItems`).
6. **Nav staff** — entrée conditionnelle « Espace trésorier » → `/admin`, gardée par `isStaffRole` (treasurer/president/network_admin) **scopée au club actif** (cookie `evolve_active_club`, `getAdminContext`) ; sous-nav `AdminTabs`.
7. **Surfaces existantes à enrichir** (pas recréer) — membre : `/dashboard` (héro « MA VALEUR » déjà présent), `/contributions` ; staff : `/admin`, `/admin/cotisations`, `/admin/settings`.
8. **Écart cahier ↔ app** — les URLs `/club/[slug]/…` du cahier sont **illustratives** ; l'app est *club-scopée par cookie* (membre sous `(app)/*`, staff sous `(app)/admin/*`). Mapping complet dans la spec §0.3.
9. **Points d'entrée nouveaux écrans** — quote-part = enrichir le héro dashboard ; tableau de bord ops + nouvelle opération + settlement + vérif Matrice + dual-mode = onglets `AdminTabs` ; mode de calcul = section dans `/admin/settings`.
10. **Garde-fous** — zéro hex en dur (tokens only) ; cash signé vert/rouge dataviz (jamais rouge marque) ; jargon banni côté membre ; `cursor-pointer` global + cibles ≥44px ; AA (AAA chiffres-clés) ; états vide/chargement/erreur obligatoires ; FR par défaut, i18n-ready.

## Thème & item actif (mécanique observée)

- **Thème** : `ThemeToggle` (atom) persiste `localStorage['ec-theme']` et pose/retire `document.documentElement.dataset.theme = 'dark'` (light = absence d'attribut). Monté dans la topbar `AppChrome`.
- **Item actif** : `resolveActiveHref` (AppChrome) compare `usePathname()` au `href` par égalité exacte **ou** préfixe (`/admin/cotisations` → onglet `/admin`) ; applique `aria-current="page"`.

## Conséquence pour le design

Les nouveaux écrans **enrichissent les surfaces existantes** (héro dashboard membre, onglets `AdminTabs`, section `settings`) plutôt que d'introduire une section « Opérations » isolée — conformément au cahier §6.2. La spec détaillée (8 écrans, 4 états chacun, ordre P0→P4, nouveaux tokens d'opérations et composants) est dans `docs/tickets/PROMPT-DESIGN-OPS-MODULE.md`.

# RGAA.md — Critères d'accessibilité à vérifier

> Source de vérité du QA a11y. L'agent `qa-a11y` lit ce fichier + lance axe (via Playwright) / Lighthouse CI.
> Niveau cible projet (CLAUDE.md) : **AA minimum, AAA sur les chiffres-clés** (quote-part, variation, valorisation).

## Règles transverses (tout écran)

1. **Contraste** : AA (≥4.5:1 texte normal, ≥3:1 grand texte/UI) ; **AAA (≥7:1) sur les chiffres-clés**.
   - ⚠ Ne jamais réduire l'opacité d'un texte coloré sous le seuil AA (cf. #R-026 : `opacity-60` sur `data-positive` → 2.46:1).
   - Texte d'alerte rouge : utiliser `--data-negative-strong` (AAA) — le `data-negative` simple peut ne pas passer AA en texte fin.
2. **Focus visible** sur chaque interactif (`shadow.glow` / ring). Navigation **clavier** complète (Tab, Enter, Escape sur les modales/popovers).
3. **Cibles tactiles ≥ 44×44px** sur mobile (dette connue : cellules cotisation, cf. #R-005).
4. **`prefers-reduced-motion`** respecté : toute animation (login dataviz, check-email, onboarding) doit se figer.
5. **Labels & landmarks** : chaque champ a un `<label>` associé ; `main`/`nav`/`header` présents ; titres hiérarchisés sans saut (`h1` unique > `h2`…).
6. **Images** : `alt` pertinent (avatar = nom, illustrations décoratives `aria-hidden`).
7. **États non-couleur** : un état (retard, sorti, bloqué) ne repose JAMAIS sur la seule couleur (badge + texte + icône).
8. **i18n** : `lang` correct (`fr`/`en`) ; pas de clé brute affichée.
9. **Jamais de `NaN`/`undefined`/écran vide** → fallback « — » / `EmptyState` / `ErrorBoundary`.

## Outils

- **axe-core** via Playwright : déjà intégré dans `apps/web/playwright/a11y.spec.ts` et `access.spec.ts`
  (`new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa'])`). **Violations bloquantes = `critical`/`serious`**.
- **Lighthouse CI** : config existante (pages publiques) — viser score a11y ≥ 90.

## Critères par écran (référence FLOWS.md)

- **Login (FLOW-001)** : label email, focus, animation check-email reduced-motion.
- **Onboarding (FLOW-002)** : `progressbar` (étapes), focus, cibles ≥44px mobile, toggle thème accessible.
- **Dashboard (FLOW-003)** : AAA quote-part, hero nommé (`button name`), nav clavier.
- **Portfolio (FLOW-004)** : AAA valorisation, table accessible, modale détail focus-trap + Escape.
- **Cotisations (FLOW-005)** : AAA alertes retard (`--data-negative-strong`), cibles cellules.
- **Admin membres (FLOW-006)** : **axe 0 violation bloquante** sur `/admin/members` (vérifié `access.spec.ts`) ; pastilles non-couleur-seule.
- **Invitations / Accès suspendu (FLOW-008/012)** : axe 0 violation sur `/admin/invitations` et `/acces-suspendu`.
- **Pages légales (FLOW-002)** : `main` > `h1` unique > `h2`, lien retour focusable.

## Dettes a11y connues (à ne pas aggraver)

- Cible tactile cellules cotisation 24px (atténué via padding ≥44px) — #R-005.
- Chip glyphe toast 20px dans chip 32px (atome `Icon` limité 16/20/24) — dette E-NTF.
- Pas de token `brand-yellow-50` → surface info via opacité `/16` (suivi design-system).

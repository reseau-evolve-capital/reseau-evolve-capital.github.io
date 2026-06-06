# VISUAL.md — Références visuelles & conformité design

> Source de vérité du QA visuel. L'agent `qa-visual` lit ce fichier pour savoir **quoi comparer** et **où**.
> **RÉFLEXE NON NÉGOCIABLE : basculer LIGHT _et_ DARK avant toute conclusion** (un écran capturé par défaut
> peut être dans l'autre thème → faux positif). Cf. CLAUDE.md « Light / Dark & source de vérité visuelle ».

## Où sont les références

### 1. Exports « standalone » exécutables (source de vérité #1)

Dossier : `/Users/lionel/Documents/OMNIVENTUS/Projects/REC/standalone-exports/*.html` (auto-suffisants).
**Servir :** `cd <dossier> && python3 -m http.server 8770` → ouvrir `http://127.0.0.1:8770/`.
La plupart ont un **toggle LIGHT/DARK** (haut de page et/ou par écran).

| Écran                                              | Fichier standalone                                                   |
| -------------------------------------------------- | -------------------------------------------------------------------- |
| `#login`, `#onboarding`                            | `Login & Onboarding - Desktop-standalone.html`                       |
| `#dashboard`                                       | `Dashboard - Standalone.html`, `DashboardStates - Standalone.html`   |
| `#portfolio`, `#contributions`, `#admin` (desktop) | `Screens-Desktop - Standalone.html`                                  |
| `#portfolio`, `#contributions` (mobile)            | `Screens-Mobile - Standalone.html`                                   |
| `#admin` invitations/accès                         | `Admin - Accès & Invitations-standalone.html`                        |
| `#attestation`                                     | `Attestation de Detention (standalone).html`                         |
| `#emails`                                          | `Emails Transactionnels (standalone).html`                           |
| Tokens/composants                                  | `Foundations - Standalone.html`, `Feedback System (standalone).html` |

### 2. Spécifications d'écran (texte)

`/Users/lionel/Documents/OMNIVENTUS/Projects/REC/Phase2_Handoff/docs/screens/0[1-5]_*.md`
(`01_login`, `02_dashboard`, `03_portfolio`, `04_contributions`, `05_*`).

### 3. Design system (tokens, palette, composants)

`REC/Phase2_Handoff/docs/design.md` + `REC/Phase2_Handoff/claude_design_session_01/tokens.css`.
Miroir code : `packages/design-system/styles/tokens.css` + `theme.css`.

### 4. Captures QA de référence (régressions visuelles)

`docs/audits/shots/` — captures datées prises en QA runtime (`qa-*.jpeg`, `qa2-*.jpeg`, `reaudit-*`, `app-*`).
Le `qa-visual` peut comparer un nouveau screenshot à la dernière capture de référence du même écran.

## Méthode de comparaison (qa-visual)

1. Démarrer l'app (`make dev-web`, **`http://localhost:3001`**) + se connecter pour de vrai (cf. agents).
2. Servir les standalone-exports sur `:8770`.
3. Pour chaque écran modifié : screenshot **desktop 1440 + mobile 375**, en **light ET dark**, + locale **fr ET en** si copy modifiée.
4. Comparer composition / hiérarchie / espacement / tokens couleur au standalone-export correspondant (basculer son toggle light/dark).
5. Sauvegarder dans `docs/audits/shots/` (`qa-<ecran>-<viewport>-<theme>.jpeg`).
6. Signaler les diffs significatifs (layout, couleurs hors tokens, débordement, manque de chrome).

## Règles couleur (à vérifier visuellement)

- **`#E93E3A` (brand.red) = branding UNIQUEMENT** — jamais pour une perte/erreur/état.
- Perte / delta négatif / retard / erreur = **`data-negative`** (`#C53030` light / `#F87171` dark), texte AAA = `--data-negative-strong`.
- Succès = `data-positive` (`#0A7A4D`) ; warning = `data-warning` (`#D97706`) ; info = `brand-yellow`.
- **Jamais de hex en dur** dans les composants : tokens Tailwind v4 générés (`bg-card`, `text-text-sec`, `bg-data-negative-50`…).
- Monnaie via `formatEUR()` (`1 234,56 €`, NBSP) ; jamais `toLocaleString` direct.

## Points de vigilance visuelle récurrents

- **Onboarding** : chrome complet (top bar logo + étape + aide + toggle), step-1 3 colonnes, dark par défaut (cf. #R-017→025).
- **Portfolio mobile** : en-tête sticky, pas de doublon « dernière sync », valo ne déborde pas en 375 (#R-009).
- **SyncBanner / bandeaux** : doivent flipper en dark (tokens sémantiques, pas `bg-neutral-*` bruts) (#R-009).
- **Avatar** : `object-cover`, cercle plein non déformé, fallback initiales propre (#R-021b).
- **Login** : split-panel desktop, panneau gauche dataviz de marque, toggle clair/sombre.
- **Emails** : brandés, lien-only, clairs par défaut (cf. `Emails Transactionnels`).

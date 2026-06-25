# Spec design E-OPS-2 — Module Opérations (trésorier)

Extraite directement depuis les sources de vérité :

- `Operations - Saisie (trésorier) - standalone.html` (P0-a + P0-b)
- `Operations - Liste & annulation (trésorier) - standalone.html` (OPS-205)

Servir via `python3 -m http.server 8770` dans `REC/standalone-exports/`.
**Toggle LIGHT/DARK obligatoire avant tout audit visuel** (bouton CLAIR/SOMBRE en haut de chaque standalone).

---

## 0. Tokens design (variables CSS)

Le theme est scopé sur `.ec-scope[data-theme="light|dark"]`. Toutes les couleurs passent par ces variables — jamais de hex en dur dans les composants.

### Palette fixe (invariante light/dark)

```
--brand-yellow: #FDC70C        accent principal
--brand-yellow-light: #FFF33B
--brand-orange: #F3903F
--brand-red: #E93E3A           EXCLUSIVEMENT branding, JAMAIS pour les pertes
--data-positive: #0E9F6E (light) / #34D399 (dark)
--data-positive-50: #E8F5F0 (light) / rgba(52,211,153,0.14) (dark)
--data-negative: #C53030 (light) / #F87171 (dark)
--data-negative-50: #FEECEE (light) / rgba(248,113,113,0.14) (dark)
--data-neutral: #8A8B8C (light) / #A0A1A3 (dark)
--data-neutral-50: #ECECE8 (light) / rgba(160,161,163,0.14) (dark)
--data-warning: #D97706 (light) / #F59E0B (dark)
--data-warning-50: #FEF4E6 (light) / rgba(245,158,11,0.14) (dark)
```

### Semantiques (changent entre light et dark)

| Token             | Light               | Dark                         |
| ----------------- | ------------------- | ---------------------------- |
| `--bg`            | `--n-50` (#FAFAF9)  | `--n-1000` (#0E0C0D)         |
| `--card`          | `--n-0` (#FFFFFF)   | #1A1718                      |
| `--card-sub`      | `--n-50` (#FAFAF9)  | #15131A                      |
| `--text`          | `--n-900` (#231F20) | `--n-50` (#FAFAF9)           |
| `--text-sec`      | `--n-600` (#5F6062) | #A0A1A3                      |
| `--text-ter`      | `--n-500` (#8A8B8C) | `--n-500`                    |
| `--border`        | `--n-200` (#E4E4DF) | #2D2A2B                      |
| `--border-strong` | `--n-300` (#D4D4CE) | #3F3F42                      |
| `--accent`        | `--brand-yellow`    | `--brand-yellow` (identique) |
| `--accent-ink`    | `--n-900`           | `--n-900` (toujours sombre)  |
| `--overlay`       | rgba(35,31,32,0.72) | rgba(0,0,0,0.72)             |

### Radii et ombres

```
--r-sm: 6px   --r-md: 10px   --r-lg: 14px   --r-pill: 9999px
--sh-card: 0 1px 3px rgba(35,31,32,0.06), 0 1px 2px rgba(35,31,32,0.04)  [light]
           0 1px 2px rgba(0,0,0,0.40), 0 0 0 1px rgba(255,255,255,0.02)  [dark]
--sh-modal: 0 12px 32px rgba(35,31,32,0.16)...  [light]
            0 16px 40px rgba(0,0,0,0.70)...       [dark]
--sh-glow: 0 0 0 4px rgba(253,199,12,0.30)   focus ring jaune
```

### Typographie

| Famille                           | Usage                                            |
| --------------------------------- | ------------------------------------------------ |
| `'Tommy Soft', sans-serif`        | Titres, montants, noms, boutons primaires        |
| `'Plus Jakarta Sans', sans-serif` | Labels, corps de texte, nav, boutons secondaires |
| `'IBM Plex Mono', monospace`      | Métadonnées, dates, caps, codes référence, ID    |

### Piège dark : `.op-btn.danger`

En DARK, la couleur de texte du bouton danger passe de `#fff` à `var(--n-1000)` (foncé).
En DARK, `.ec-logo .mk` inverse : fond jaune / texte sombre.
En DARK, `.ec-avatar` : fond `--brand-yellow` / texte `--n-900`.
En DARK, `.tb.up` : `color: #6EE7B7` (vert clair), `.tb.down` : `color: #FCA5A5` (rouge clair).

---

## 1. Shell admin commun (`OpShell`)

Dimensions canvas : **1440×900px** desktop / **375×812px** mobile.

### Structure desktop

```
1440px
┌─────────────────────────────────────────────────────────────┐
│ Sidebar 256px │ Main (flex-grow)                            │
│               │ Topbar h=64px                               │
│               │ AdminTabs h=54px                            │
│               │ Content (overflow:auto, flex:1)             │
└─────────────────────────────────────────────────────────────┘
```

### Sidebar (256px, `background: var(--card)`)

- Padding : 22px 16px
- Logo en haut (paddingLeft: 6px, marginBottom: 28px)
- Caption « Espace membre » (`.ec-caption`, marginBottom: 8px, paddingLeft: 6px, fontSize: 10px)
- Nav verticale, gap: 3px
  - Liens : `padding: 11px 12px`, `minHeight: 44px`, `borderRadius: 8px`
  - Actif : `background: var(--accent)`, `color: var(--accent-ink)`, `fontWeight: 700`
  - Inactif : `color: var(--text-sec)`, `fontWeight: 500`
  - Item actif = **Espace trésorier** (icone bouclier)
- Bas de sidebar : encart « Club actif » (`background: var(--card-sub)`, `border: var(--border)`, `borderRadius: var(--r-md)`, padding: 14px)
  - Caption « Club actif »
  - Nom du club : Tommy Soft 700 14px
  - Nb membres : IBM Plex Mono 11px, `color: var(--text-ter)`

### Topbar (h=64px, `background: var(--bg)`)

- Gauche : indicateur sync (`•` vert `var(--data-positive)` + halo `--data-positive-50` 3px, texte IBM Plex Mono 11px « Synchronisé il y a 3 min »)
- Droite : bouton date pill (border, `--card`, Plus Jakarta Sans 13px) + toggle FR/EN + bouton thème lune + avatar initiales
- Avatar : `.ec-avatar` = cercle 40px, fond `--n-900`/texte `--brand-yellow` (light) ; inversé dark

### AdminTabs (h=54px)

- 8 onglets : Tableau de bord / Opérations / Membres / Cotisations / Quotes-parts / Vérification / Votes / Paramètres
- Padding : 0 32px
- Onglet actif : `color: var(--text)`, `fontWeight: 700`, **barre de 2.5px `var(--accent)` en bas (position: absolute, bottom: -1px)**
- Onglet inactif : `color: var(--text-sec)`, `fontWeight: 500`
- Font : Plus Jakarta Sans 14px, icone 17px + label, gap 8px, marginRight 18px entre onglets
- L'onglet actif pour OPS-205 = « Opérations »

---

## 2. Catalogue des types d'opération (OPTYPES)

Ces constantes pilotent les chips, les couleurs, et le signe du delta cash :

| Clé          | Label      | Description            | chipBg                                       | chipFg            | signe cash |
| ------------ | ---------- | ---------------------- | -------------------------------------------- | ----------------- | ---------- |
| `cotisation` | Cotisation | Versement d'un membre  | `--data-positive-50`                         | `--data-positive` | +1         |
| `achat`      | Achat      | Acquisition d'un titre | `--data-neutral-50`                          | `--text-sec`      | -1         |
| `vente`      | Vente      | Cession d'un titre     | `--data-neutral-50`                          | `--text-sec`      | +1         |
| `dividende`  | Dividende  | Revenu d'un titre      | `color-mix(--brand-yellow 14%, transparent)` | `--accent-ink`    | +1         |
| `frais`      | Frais      | Courtage, charges      | `--data-warning-50`                          | `--data-warning`  | -1         |
| `penalite`   | Pénalité   | Retard, sanction       | `--data-negative-50`                         | `--data-negative` | -1         |

**Piège dark - dividende** : la couleur `chipFg` pour `dividende` est gérée par la classe CSS `.op-chip-div` (`color: var(--accent-ink)` en light, `color: var(--brand-yellow)` en dark) et non via l'inline style, pour rester lisible.

### OpChip (pastille ronde)

- Taille par défaut : 40px (liste) / 44-48px (drawer/formulaire)
- `borderRadius: 999px`
- Icone = `size * 0.5` (20px pour 40px), stroke 1.85
- `bg: t.chipBg`, `color: t.chipFg`

### CashDeltaBadge

```
bg: valeur >= 0 ? --data-positive-50 : --data-negative-50
color: valeur >= 0 ? --data-positive : --data-negative
borderRadius: --r-pill
fontFamily: Tommy Soft, fontWeight: 700
fontSize: 13.5px (md) / 16px (lg)
padding: 5px 11px (md) / 7px 14px (lg)
gap: 6px (si icone)
fontFeatureSettings: "tnum","lnum"
whiteSpace: nowrap
```

Format : `signedEur(n)` = `+300 €` ou `−24 800 €` (MINUS U+2212, NBSP U+00A0 avant `€`).
Valeur nulle → `+0 €` ou `0 €` (signe neutre, fond `--data-positive-50`).

**Piège : le rouge `--brand-red (#E93E3A)` n'est JAMAIS utilisé ici.** La perte utilise `--data-negative`.

---

## 3. Écran P0-a — Tableau de bord Opérations

**Route :** `/admin` → onglet « Opérations »
**Fichier source :** `Operations - Saisie (trésorier) - standalone.html`, Group `P0-a`
**Composant :** `OpsDashboardPage`

### Layout

```
OpShell (sidebar + topbar + AdminTabs [onglet Opérations actif])
  └── Content (overflow:auto)
        └── OpsDashBody
              padding: 30px 48px 64px
              maxWidth: 1240px (centré)
              ┌─ Caption + H1 « Opérations » (Tommy Soft 800 32px, -0.03em)
              ├─ CashBalanceCard          (margin: 0)
              ├─ QuickActions             (marginTop: 26px)
              ├─ PendingWaveCard          (marginTop: 26px, état "ok" seulement)
              └─ RecentOps               (marginTop: 26px)
```

### 3.1 CashBalanceCard

**État normal (ok) :**

```
background: var(--card)
border: 1px solid var(--border)
borderRadius: var(--r-lg)          ← 14px
boxShadow: var(--sh-card)
padding: 26px 28px
display: flex, alignItems: center, justifyContent: space-between, gap: 24px, flexWrap: wrap
```

Colonne gauche :

- Caption `Solde espèces` (`.ec-caption` fontSize 10px) + tooltip `(i)` à droite (`.cot-info`)
  - Tooltip text : « Argent disponible sur le compte du club, hors titres détenus. »
- Montant : Tommy Soft 900, **fontSize 54px**, letterSpacing -0.035em, lineHeight 0.95, `color: var(--text)`, `fontFeatureSettings: "tnum","lnum"`, `aria-live: polite`
  - Format : `eurO(86260)` → `86 260 €` (formatEUR FR, NBSP, 0 décimales)
- Timestamp : IBM Plex Mono 11px, letterSpacing 0.06em, uppercase, `color: var(--text-ter)`, icone horloge + « Calculé il y a 3 min »

Colonne droite — badge de cohérence courtier (`.op-clickcard`) :

- `background: var(--data-positive-50)`, `border: 1px solid color-mix(--data-positive 28%, transparent)`
- `borderRadius: var(--r-pill)`, padding 12px 16px 12px 14px, gap 12px
- Icone check : cercle 30px fond `--data-positive`, couleur `#fff`, icone 16px stroke 2.6
- Texte : « Cohérent avec Bourse Direct » (Tommy Soft 700 14px, `color: var(--data-positive)`) + « Vérifier le rapprochement → » (12px, `--text-ter`)
- `aria-label: "Cohérent avec Bourse Direct — ouvrir la vérification"`

**État vide (empty) :**

- Colonne droite remplacée par du texte d'invitation (fontSize 14px, `--text-sec`, maxWidth 280px)

**État chargement (loading) :**

- Skeleton : rectangles `.op-sk` animés (shimmer `--brand-yellow` 12%)
- Layout : 3 Sk empilés à gauche + 1 Sk pill à droite

**État erreur (error) :**

- Bande dégradée 4px en haut (`--brand-yellow` → `--brand-orange` → `--brand-red`)
- `border: 1px solid color-mix(--data-negative 32%, --border)`
- Icone warn (cercle 48px, `--data-warning-50`/`--data-warning`) + texte + bouton `op-btn secondary` « Réessayer »

**Valeur négative :** Le solde espèces est `color: var(--text)` (neutre), PAS coloré en rouge même si négatif. Seul le `CashDeltaBadge` colore selon le signe.

### 3.2 QuickActions

Caption « Actions rapides » (fontSize 10px, marginBottom 12px).

Grille `repeat(4, 1fr)`, gap 14px. 4 boutons (`.op-quick`) : Cotisation / Achat / Vente / Dividende.

Chaque `.op-quick` :

```
minHeight: 64px
borderRadius: var(--r-md)
background: var(--card), border: 1px solid var(--border), boxShadow: var(--sh-card)
display: flex, alignItems: center, gap: 12px, padding: 12px 16px
transition: border-color 150ms, transform 150ms
hover: border-color --border-strong, translateY(-1px)
```

- `OpChip` 38px
- Label : `.op-quick .lbl` = Tommy Soft 700 15px `--text`
- Icone `+` à droite (`.op-quick .add` = `--text-ter`, passe à `--text` au hover)

### 3.3 PendingWaveCard

Carte cliquable (`.op-clickcard`) avec bordure jaune.

```
background: var(--card)
border: 1px solid color-mix(--brand-yellow 45%, --border)
borderRadius: var(--r-md)
boxShadow: var(--sh-card)
padding: 20px 22px
display: flex, alignItems: center, gap: 20px, flexWrap: wrap
```

- Icone pièce : carré 46px `borderRadius 12px`, fond `color-mix(--brand-yellow 16%, transparent)`, `color: var(--accent-ink)`
- Zone texte :
  - Titre : Tommy Soft 800 18px -0.02em « 3 cotisations en attente » + IBM Plex Mono 12px `--text-ter` « · 900 € »
  - Sous-titre : 13.5px `--text-sec` « Vague du 16 – 22 juin 2026 · à intégrer au portefeuille »
- CTA : `.op-btn primary` `minHeight: 44px` « Traiter maintenant » + icone flèche droite

**Note :** Ce CTA « Traiter maintenant » est lié au settlement de cotisations (distribution de parts). Il n'est affiché que si `state === 'ok'` (masqué en empty/loading/error). Son flux de settlement est hors périmètre E-OPS-2 — afficher un placeholder ou désactiver le bouton en attendant.

### 3.4 RecentOps (Dernières opérations)

```
background: var(--card), border: 1px solid var(--border), borderRadius: var(--r-md), boxShadow: var(--sh-card), overflow: hidden
```

En-tête :

- `padding: 16px 22px`, `borderBottom: 1px solid var(--border)`
- H2 « Dernières opérations » : Tommy Soft 800 18px -0.02em
- Lien « tout voir → » (fontSize 13px, fontWeight 600, `color: var(--text)`, `borderBottom: 1px solid var(--accent)`)

Corps — liste de `OperationListItem` :

```
.op-row
  padding: 14px 22px
  borderBottom: 1px solid var(--border) (dernier = 0)
  display: flex, alignItems: center, gap: 14px
  role: button, tabIndex: 0
  hover: background var(--card-sub)
  transition: background 150ms
```

Chaque ligne :

- `OpChip` 40px
- Zone texte (flex:1) :
  - Ligne 1 : Tommy Soft 700 15px -0.01em `--text` (libellé) + badge type IBM Plex Mono 10px uppercase `--text-ter`/`--card-sub` padding 2px 7px borderRadius 5px
  - Ligne 2 : 13px `--text-sec`, marginTop 3px : `{meta} · {date}`
- `CashDeltaBadge` (taille md)
- Chevron droit (`.chev`, 16px stroke 2, `--text-ter` opacity 0.5, passe à 1 au hover + translateX 2px)

Données de référence (6 lignes) :

| type       | label             | meta                 | date    | delta   |
| ---------- | ----------------- | -------------------- | ------- | ------- |
| cotisation | Éric Lambert      | Cotisation de juin   | 18 juin | +300    |
| cotisation | Mehdi Brahimi     | Cotisation de juin   | 17 juin | +300    |
| dividende  | Sanofi            | Dividende en espèces | 16 juin | +1 240  |
| vente      | LVMH              | 8 titres @ 672,50 €  | 12 juin | +5 380  |
| frais      | Frais de courtage | Bourse Direct        | 12 juin | -18     |
| achat      | NASDAQ:NVDA       | 160 titres @ 155 €   | 10 juin | -24 800 |

**État vide :** Centré, icône ledger cercle 58px `--card-sub`, H3 « Aucune opération pour l'instant », texte 14px + bouton `.op-btn primary` « Enregistrer la première ».

**État chargement :** 4 lignes skeleton (Sk 40px rond + Sk 160px h13 + Sk 110px h11 + Sk 84px h28 r999).

**Mobile (375px) :**

- Header 54px avec flèche retour
- Filtres horizontaux scrollables (FilterChip Type + Période)
- Liste : chip 36px, label 14px, date 11.5px `--text-ter`, `CashDeltaBadge` à droite
- 4 items max (preview)
- BottomNav fixé (4 items : Tableau/Portef./Trésor./Réseau), actif = Trésor. en `--brand-yellow`

---

## 4. Écran P0-b — Nouvelle opération (assistant 3 étapes)

**Route :** `/admin/operations/nouvelle`
**Fichier source :** `Operations - Saisie (trésorier) - standalone.html`, Group `P0-b`
**Composant :** `NouvelleOpPage`

### Architecture

Shell identique à P0-a (OpShell avec sidebar + topbar + AdminTabs), **plus** un sous-en-tête collant (`position: sticky, top: 0, zIndex: 5`) entre AdminTabs et le contenu.

### StepHeader (sous-en-tête collant)

```
height: 56px
background: var(--bg)
borderBottom: 1px solid var(--border)
padding: 0 32px
display: flex, alignItems: center, gap: 18px
```

Gauche à droite :

- Lien « ← Opérations » (Plus Jakarta Sans 600 13.5px, `--text-sec`)
- Séparateur vertical 1px `--border` h=22px
- Titre « Nouvelle opération » (Tommy Soft 700 15px)
- Droite : indicateur d'étapes + label

Indicateur d'étapes (3 pills) :

- Pill active (step courant) : width 26px, h=5px, `--brand-yellow`
- Pill passée : width 18px, h=5px, `--brand-yellow`
- Pill future : width 18px, h=5px, `--border-strong`
- `borderRadius: 9999px`
- `transition: all 220ms var(--ease-std)`
- Suivi de « Étape N / 3 » (IBM Plex Mono 11px uppercase `--text-ter`)

### Étape 1 — Sélecteur de type

Content area padding : `44px 32px 64px`, maxWidth 720px centré.

```
Caption « Étape 1 · Type d'opération » (fontSize 10px, marginBottom 10px)
H1 « Quelle opération veux-tu enregistrer ? » (Tommy Soft 800 30px -0.03em, lineHeight 1.05)
Texte intro (15px --text-sec, maxWidth 52ch, lineHeight 1.55, margin 10px 0 28px)
TypeSelector (grille 3 colonnes, gap 16px)
```

**TypeSelector :** 6 cartes (`.op-typecard`) en grille `repeat(3, 1fr)` :

```
.op-typecard
  borderRadius: var(--r-md)
  background: var(--card), border: 1px solid var(--border), boxShadow: var(--sh-card)
  display: flex, flexDirection: column, alignItems: flex-start, gap: 14px
  padding: 22px 20px
  transition: border-color 150ms, transform 150ms
  hover: border-color --text-ter, translateY(-2px)
  active: scale(0.99)
```

Contenu :

- `OpChip` 48px
- `.tname` : Tommy Soft 700 16px -0.01em `--text`
- `.tdesc` : 12.5px `--text-ter` lineHeight 1.4
- `.tgo` : icone ArrowR 16px `--text-ter` (en bas, marginTop auto)

Ordre : cotisation / achat / vente / dividende / frais / pénalité

### Étape 2 — Formulaire adaptatif

Content area : `40px 32px 64px`, maxWidth 720px centré.

En-tête du formulaire :

```
Caption « Étape 2 · Détails de l'opération » (fontSize 10px, marginBottom 12px)
Flex (alignItems center, gap 14px, marginBottom 26px) :
  OpChip 48px
  H1 type.label (Tommy Soft 800 26px -0.025em)
  Sous-texte type.desc (13.5px --text-sec)
  [Lien « Changer de type » poussé à droite (13px --text-sec 600)]
```

Zone formulaire :

```
background: var(--card), border: 1px solid var(--border), borderRadius: var(--r-lg), boxShadow: var(--sh-card)
padding: 26px 26px
grille 2 colonnes, gap 18px
```

**Structure d'un champ (`.op-field`) :**

```
display: flex, flexDirection: column, gap: 8px
label : Plus Jakarta Sans 600 12px uppercase 0.05em --text-ter
        + .req (asterisque --data-negative si obligatoire)
input/select : .op-input / .op-select
  border: 1px solid --border-strong
  background: var(--card), color: var(--text)
  borderRadius: var(--r-md), padding: 13px 15px
  focus: boxShadow var(--sh-glow), border-color --brand-yellow
  erreur: border-color --data-negative ; focus erreur: boxShadow 4px --data-negative-50
hint : .op-hint 12.5px --text-ter
erreur : .op-fielderr (--data-negative, icone Bang 14px)
```

#### Cotisation (champs)

| Champ              | Col    | Requis | Valeur démo                       | Hint/erreur                                        |
| ------------------ | ------ | ------ | --------------------------------- | -------------------------------------------------- |
| Membre             | span 2 | \*     | Sofia Rossi (Select)              | —                                                  |
| Montant            | 1      | \*     | 300 (Input, suffix €)             | « Cotisation mensuelle du club : 300 €. »          |
| Date               | 1      | \*     | 22 juin 2026                      | —                                                  |
| Référence virement | 1      | non    | placeholder « ex. VIR-2026-0618 » | —                                                  |
| Notes              | 1      | non    | placeholder « Optionnel »         | —                                                  |
| CashImpact         | span 2 | —      | +300                              | « Cotisation encaissée → entre au solde espèces. » |

FooterNote : « Le membre reçoit un reçu par e-mail. Minimum 100 € par cotisation. »

**Erreur guidée (cotisation) :**

- Champ Montant : valeur 40, border `--data-negative`, `.op-fielderr` « Montant sous le minimum de 100 €. »
- `CashImpact` reste visible avec valeur erronée (+40)

#### Achat (champs)

| Champ              | Col    | Requis | Valeur démo                      | Hint                                                   |
| ------------------ | ------ | ------ | -------------------------------- | ------------------------------------------------------ |
| Titre              | span 2 | \*     | NASDAQ:NVDA                      | « Auto-complété depuis les positions et les marchés. » |
| Nom du titre       | 1      | non    | NVIDIA Corp.                     | —                                                      |
| Quantité           | 1      | \*     | 1 505                            | —                                                      |
| Prix unitaire      | 1      | \*     | 154,97 (suffix €)                | —                                                      |
| Date               | 1      | \*     | 22 juin 2026                     | —                                                      |
| Devise             | 1      | non    | EUR                              | —                                                      |
| Référence courtier | 1      | non    | placeholder « ex. BD-NVDA-0622 » | —                                                      |
| CashImpact         | span 2 | —      | -233 229                         | « 1 505 titres × 154,97 € — sort du solde espèces. »   |

FooterNote : « Le titre est ajouté aux positions du portefeuille à son prix d'achat. »

**Libellés canoniques :** « Titre » (pas « Actif »), « Quantité » (pas « Parts »), « Prix unitaire » (pas « PRU »).

#### CashImpact (encart AVANT validation)

```
gridColumn: span 2
display: flex, alignItems: center, justifyContent: space-between, gap 16px, flexWrap: wrap
padding: 16px 18px
borderRadius: var(--r-md)
background: var(--card-sub), border: 1px solid var(--border)
marginTop: 4px
```

- Gauche : caption « Impact sur le solde espèces » (fontSize 10px, marginBottom 6px) + note (13px --text-sec)
- Droite : `CashDeltaBadge` taille `lg` (16px, padding 7px 14px)

CTA principal (pleine largeur, marginTop 24px) : `.op-btn.primary` « Enregistrer l'opération »

### Étape 3 — Confirmation

Content area : `52px 32px 64px`, maxWidth 640px centré.

```
Centré (textAlign: center) :
  Icone check : cercle 64px --data-positive-50 / --data-positive, icone 32px stroke 2.4
  H1 « Opération enregistrée » (Tommy Soft 800 28px -0.025em)
  Texte (15px --text-sec) « La cotisation de Sofia Rossi a bien été ajoutée. »

Récap card (marginTop 32px) :
  background: var(--card), border: var(--border), borderRadius: var(--r-md), boxShadow: var(--sh-card)
  En-tête (padding 18px 22px, borderBottom) :
    OpChip 40px + Label/date + CashDeltaBadge lg
  Zone solde (padding 20px 22px, background: var(--card-sub)) :
    Caption « Nouveau solde espèces »
    Ancien solde barré (Tommy Soft 700 22px --text-ter line-through) + flèche + Nouveau solde (Tommy Soft 900 30px --text)
    CashDeltaBadge à droite

2 boutons (marginTop 26px, gap 12px) :
  .op-btn.secondary (flex 1) « Voir les opérations »
  .op-btn.primary (flex 1) + icone Plus « Nouvelle opération »
```

Données de démo : solde avant `86 260 €` → après `86 560 €`, delta `+300 €` (cotisation Sofia Rossi).

### Mobile P0-b (375px)

En-tête sticky : 54px + barre de progression 3 segments (`flex: 1 / flex: 1 / flex: 1`, h=4px, active `--brand-yellow`, future `--border-strong`). Pas de largeur variable (contrairement au desktop où l'active fait 26px).

CTA collant en bas :

```
borderTop: 1px solid var(--border)
background: var(--card)
padding: 12px 20px calc(12px + env(safe-area-inset-bottom))
button .op-btn.primary pleine largeur
```

Étape 1 mobile : TypeSelector avec `gridTemplateColumns: 1fr 1fr`, gap 12px, minHeight 104px, padding 16px (compact).
Étape 2 mobile : stack vertical de fields + CashImpact.

---

## 5. Écran OPS-205 — Toutes les opérations (liste + annulation)

**Route :** `/admin/operations` (destination du « tout voir → » et du chevron depuis P0-a)
**Fichier source :** `Operations - Liste & annulation (trésorier) - standalone.html`
**Composant :** `OperationsListPage`

### Layout

```
OpShell (AdminTabs, onglet Opérations actif)
  └── Content (overflow:auto)
        └── div (padding: 30px 48px 64px, maxWidth: 1180px centré)
              En-tête (space-between, gap 16px)
              Carte principale (liste + filtres)
              Drawer de détail (position: absolute, droite)
              Modale d'annulation (position: absolute, centrée)
```

### En-tête de page

```
Caption « Evolve Capital · Trésorerie · Opérations » (fontSize 10px, marginBottom 8px)
H1 « Toutes les opérations » (Tommy Soft 800 32px -0.03em, lineHeight 1)
Bouton .op-btn.primary « + Nouvelle opération » (minHeight 44px)
```

### Filtres

```
padding: 14px 18px, borderBottom: 1px solid var(--border), flexWrap: wrap, gap 10px
3 FilterChip :
  Type  → valeur : « Tous »
  Membre → valeur : « Tous »
  Période → valeur : « 6 derniers mois »
  [Libellé à droite : « Trié par date » + IcoChevD (14px)]
```

**FilterChip (`.cot-filter`) :**

```
border: 1px solid --border-strong, background: var(--card), color: var(--text)
minHeight: 40px, borderRadius: var(--r-pill), padding horizontal, gap entre label/value
.lab : --text-ter 12.5px 500
valeur : --text
chevron : --text-ter IcoChevD 15px
hover: border-color --text-ter
```

### OpListRow (ligne de liste complète)

```
.op-row (flex, alignItems: center, gap: 14px)
opacity: cancelled ? 0.6 : 1
padding: inline 22px
```

1. `OpChip` 40px (grayscale 0.7 si annulée)
2. Zone texte (flex:1) :
   - Ligne 1 : Tommy Soft 700 15px (label, **`textDecoration: line-through` si annulée**) + badge type (IBM Plex Mono 10px, `--card-sub`/`--text-ter`) + `StatusTag`
   - Ligne 2 : 12.5px `--text-sec` : `{meta} · {date}`
3. Zone source (width 78px fixe) : `SourceTag`
4. `CashDeltaBadge` (opacity 0.5 + line-through si annulée)
5. Chevron `.chev`

**SourceTag :**

```
IBM Plex Mono 9.5px uppercase 0.06em 600 --text-ter
Manuel : pastille ronde 6×6px --data-neutral opacity 0.7
Migré : pastille carrée 6×6px (borderRadius 2px) --data-warning opacity 0.7
```

**StatusTag :**

```
Settlée : IBM Plex Mono 9.5px uppercase 600
  background: color-mix(--brand-yellow 16%, transparent)
  color: --accent-ink (classe .op-chip-div → dark = --brand-yellow)
  padding: 3px 8px, borderRadius: 999

Annulée : IBM Plex Mono 9.5px uppercase 600
  background: var(--card-sub)
  color: var(--text-ter)
  border: 1px solid --border-strong
  padding: 3px 8px, borderRadius: 999
```

**Piège dark - StatusTag Settlée :** en dark, `.op-chip-div` donne `color: var(--brand-yellow)` au lieu de `--accent-ink`.

### Données de référence (10 opérations, ordre décroissant)

| ID     | type       | label             | meta                          | date         | delta   | source | status                                                                            |
| ------ | ---------- | ----------------- | ----------------------------- | ------------ | ------- | ------ | --------------------------------------------------------------------------------- |
| OP-318 | cotisation | Éric Lambert      | Cotisation de juin            | 18 juin 2026 | +300    | manuel | ok                                                                                |
| OP-317 | cotisation | Mehdi Brahimi     | Cotisation de juin            | 17 juin 2026 | +300    | manuel | ok                                                                                |
| OP-316 | dividende  | Sanofi            | Dividende en espèces          | 16 juin 2026 | +1 240  | manuel | ok                                                                                |
| OP-314 | vente      | LVMH              | 8 titres @ 672,50 €           | 12 juin 2026 | +5 380  | manuel | ok                                                                                |
| OP-313 | frais      | Frais de courtage | Bourse Direct                 | 12 juin 2026 | -18     | manuel | ok                                                                                |
| OP-310 | achat      | NASDAQ:NVDA       | 160 titres @ 155 €            | 10 juin 2026 | -24 800 | manuel | ok                                                                                |
| OP-298 | cotisation | Sofia Rossi       | Cotisation de mai · 150 parts | 16 mai 2026  | +300    | manuel | **settled**                                                                       |
| OP-274 | achat      | ASML              | 20 titres @ 620 €             | 2 mai 2026   | -12 400 | migre  | ok                                                                                |
| OP-241 | cotisation | Éric Lambert      | Cotisation d'avril            | 18 avr. 2026 | +300    | migre  | **cancelled** (motif : « Doublon de saisie lors de la migration de la matrice. ») |
| OP-238 | dividende  | TotalEnergies     | Dividende en espèces          | 12 avr. 2026 | +860    | migre  | ok                                                                                |

### OpDetailDrawer (panneau de détail)

Déclenché par un clic sur une ligne. Overlay + drawer depuis la droite.

```
position: absolute, inset: 0, zIndex: 70
overlay: background var(--overlay) (plein écran, clic ferme)
drawer: width 440px, height 100%, background var(--card)
  borderLeft: 1px solid var(--border), boxShadow: var(--sh-modal)
  display: flex, flexDirection: column
  role: dialog, aria-modal: true
```

**En-tête drawer :**

```
padding: 20px 24px, borderBottom: 1px solid var(--border)
flex, alignItems: center, gap 12px
  OpChip 44px
  H2 label (Tommy Soft 800 19px -0.02em, line-through si cancelled)
  StatusTag
  Sous-texte IBM Plex Mono 11px --text-ter : « {type} · {id} »
  Bouton fermer (X, 38px, borderRadius 999, transparent)
```

**Corps drawer (scrollable) :**

Zone montant (centré, padding 20px 0, borderBottom) :

```
caption « Impact sur le solde » (fontSize 10px, marginBottom 8px)
Montant signé (Tommy Soft 900 38px -0.03em, fontFeatureSettings "tnum","lnum")
  cancelled : color --text-ter + line-through
  delta>=0 : color --data-positive
  delta<0 : color --data-negative
Si cancelled : texte 12.5px --text-ter « Ne compte plus dans le solde du club. »
```

Lignes de détail (`DetailRow`) : label 13px `--text-ter` / valeur 14px 600 `--text`, séparées par `borderBottom: 1px solid var(--border)`, `padding: 12px 0`

| Clé       | Valeur                                     |
| --------- | ------------------------------------------ |
| Date      | {op.date}                                  |
| Type      | {type.label}                               |
| Référence | {op.ref}                                   |
| Source    | « Migré (matrice) » ou « Saisie manuelle » |
| Détail    | {op.meta}                                  |

Si `cancelled` : encart motif :

```
marginTop: 16px, padding 14px 16px
borderRadius: var(--r-md), background: var(--card-sub), border: 1px solid var(--border)
caption « Motif d'annulation » (fontSize 10px)
texte motif (13.5px --text-sec lineHeight 1.5)
```

**Footer drawer :**

```
padding: 16px 24px, borderTop: 1px solid var(--border), background: var(--card-sub)
```

Selon statut :

- `cancelled` : texte centré 13px `--text-ter` « Opération annulée — conservée pour l'historique. »
- `settled` : bouton `.op-btn.ghost` disabled opacity 0.5 pleine largeur « Annuler l'opération » + avertissement warning (IcoWarn 15px `--data-warning` + texte 12.5px « Opération settlée (parts distribuées) — passe par une **correction**, pas une annulation. »)
- `ok` : bouton `.op-btn.danger` pleine largeur « Annuler l'opération »

### CancelModal (modale d'annulation)

```
position: absolute, inset: 0, zIndex: 90 (par-dessus le drawer)
overlay + dialog centré
dialog: width min(520px, 100%), background var(--card)
  border: 1px solid var(--border)
  borderRadius: var(--r-lg), boxShadow: var(--sh-modal), overflow: hidden
```

**Corps modal :**

Header (`padding: 24px 24px 0`) :

```
Icone warn : cercle 46px --data-warning-50 / --data-warning, icone 24px
H2 « Annuler cette opération ? » (Tommy Soft 800 21px -0.02em)
Texte résumé (14px --text-sec lineHeight 1.55) :
  « L'opération {label} · {signedEur(delta)} ne comptera plus dans le solde.
    Elle reste visible dans l'historique, barrée, avec son motif. »
```

Champ motif (`padding: 18px 24px`) :

```
label : Plus Jakarta Sans 600 12px uppercase 0.05em --text-ter
  + astérisque --data-negative : « Motif de l'annulation * »
textarea .op-input (rows=3)
  placeholder : « ex. Doublon de saisie, montant erroné… »
  aria-label : « Motif de l'annulation »
  marginTop 8px
.op-hint (marginTop 8px) : « Obligatoire — conservé dans la trace de l'opération. »
```

Footer modal (`padding: 16px 24px, borderTop: 1px solid var(--border), background: var(--card-sub)`) :

```
display: flex, justifyContent: flex-end, gap: 10px
.op-btn.secondary « Garder l'opération »
.op-btn.danger « Confirmer l'annulation »
```

### États de la liste

**Vide :**

```
background: var(--card), border: 1px dashed var(--border-strong)
borderRadius: var(--r-md), padding: 64px 24px, textAlign: center
Icone ledger cercle 60px --card-sub/--border/--text-ter
H3 « Aucune opération enregistrée » (Tommy Soft 800 20px)
Texte 14px --text-sec (maxWidth 42ch, marginInline auto)
.op-btn.primary « + Enregistrer la première »
```

**Chargement :** 5 lignes skeleton (rond 40px + rect 170px h13 + rect 120px h11 + rect 70px h12 + rect 84px h28 r999), padding 14px 22px chacune.

**Erreur :** Même pattern qu'en P0-a (bande dégradée 4px + icone refr + texte + bouton Réessayer).

### Mobile OPS-205 (375px)

```
Header 54px (bouton retour 34px + titre « Toutes les opérations »)
Filtres (2 FilterChip : Type + Période « 6 mois », scrollX, padding 12px 16px, borderBottom)
Liste scrollable (flex:1)
  Chaque item : chip 38px + label 14px (line-through si cancelled) + StatusTag + date 11.5px --text-ter + CashDeltaBadge
  Opacity 0.6 si cancelled
```

Pas de colonne source sur mobile (masquée).

---

## 6. Classes CSS des boutons (récap)

| Classe              | Background        | Couleur                            | Border                | Usage                  |
| ------------------- | ----------------- | ---------------------------------- | --------------------- | ---------------------- |
| `.op-btn.primary`   | `--brand-yellow`  | `--n-900`                          | 0                     | Action principale      |
| `.op-btn.secondary` | `var(--card)`     | `var(--text)`                      | `1px --border-strong` | Action secondaire      |
| `.op-btn.danger`    | `--data-negative` | `#fff` (light) / `--n-1000` (dark) | 0                     | Annulation destructive |
| `.op-btn.ghost`     | transparent       | `--text-sec`                       | `1px --border`        | Désactivé (settled)    |

Toutes les `.op-btn` : `minHeight: 44px`, `borderRadius: var(--r-pill)`, Plus Jakarta Sans 700 14px, `padding: 0 22px`, `cursor: pointer`, `transition: opacity/border/bg/transform 150ms`, `active: scale(0.985)`.

---

## 7. Map écran → composant → route

| Écran                    | Composant principal                        | Sous-composants                                                                        | Route                                        |
| ------------------------ | ------------------------------------------ | -------------------------------------------------------------------------------------- | -------------------------------------------- |
| P0-a Tableau de bord     | `OpsDashboardPage`                         | `CashBalanceCard`, `QuickActions`, `PendingWaveCard`, `RecentOps`, `OperationListItem` | `/admin` (onglet Opérations)                 |
| P0-b Étape 1             | `NouvelleOpPage` (step=1)                  | `StepHeader`, `TypeSelector`, `TypeCard`                                               | `/admin/operations/nouvelle`                 |
| P0-b Étape 2 cotisation  | `NouvelleOpPage` (step=2, type=cotisation) | `StepHeader`, `FormShell`, `CotisationForm`, `Field`, `CashImpact`                     | `/admin/operations/nouvelle?type=cotisation` |
| P0-b Étape 2 achat       | `NouvelleOpPage` (step=2, type=achat)      | `StepHeader`, `FormShell`, `AchatForm`, `Field`, `CashImpact`                          | `/admin/operations/nouvelle?type=achat`      |
| P0-b Étape 3             | `NouvelleOpPage` (step=3)                  | `StepHeader`, `Step3Body`                                                              | `/admin/operations/nouvelle` (après submit)  |
| OPS-205 Liste            | `OperationsListPage` (state=rempli)        | `FilterChip`, `OpListRow`, `SourceTag`, `StatusTag`                                    | `/admin/operations`                          |
| OPS-205 Détail annulable | `OperationsListPage` (open=OP-310)         | `OpDetailDrawer`                                                                       | `/admin/operations`                          |
| OPS-205 Détail settlé    | `OperationsListPage` (open=OP-298)         | `OpDetailDrawer`                                                                       | `/admin/operations`                          |
| OPS-205 Annulation       | `OperationsListPage` (open=OP-310, modal)  | `OpDetailDrawer` + `CancelModal`                                                       | `/admin/operations`                          |

---

## 8. Pièges de convergence light/dark

1. **`--data-positive` et `--data-negative`** changent de valeur entre light (#0E9F6E, #C53030) et dark (#34D399, #F87171). Les `CashDeltaBadge` et montants dans le drawer héritent de ce changement automatiquement via les variables.

2. **`.op-btn.danger` :** couleur de texte `#fff` en light, `var(--n-1000)` en dark — à implémenter via override CSS.

3. **StatusTag Settlée :** classe `.op-chip-div` requise pour le comportement dark (yellow au lieu de accent-ink).

4. **Dividende chip :** même règle `.op-chip-div` sur le `OpChip` — ne pas utiliser l'inline `color` pour le type dividende.

5. **`.ec-avatar` et `.ec-logo .mk` :** inversés en dark (fond jaune texte sombre).

6. **Ombres** : `--sh-card` et `--sh-modal` sont beaucoup plus prononcées en dark (opacité élevée).

7. **`--bg-page`** (`#F4F4F2` light / `#07070A` dark) utilisé pour le themeswitch et les bg de formulaire.

8. **`--tb.up` en dark :** la couleur de texte passe de `--data-positive` (#34D399) à une valeur explicite `#6EE7B7` (vert encore plus clair). Idem `tb.down` → `#FCA5A5`.

9. **Tooltips `.cot-tip` :** fond `--n-900` en light, fond `#2D2A2B` avec border en dark. La flèche CSS change aussi de couleur.

10. **Opération annulée :** trois niveaux simultanés — `opacity: 0.6` sur la ligne, `grayscale(0.7)` sur le chip, `text-decoration: line-through` sur le label et le badge montant. Ne pas oublier le grayscale sur le chip (filtre CSS).

11. **Settlement « Traiter maintenant » :** le bouton est présent dans la réf mais son flux est hors périmètre E-OPS-2 (distribution de parts). Afficher un placeholder ou désactiver.

12. **Scroll horizontal filtres mobile :** `overflowX: auto` sur la zone filtres — ne pas oublier de masquer la scrollbar native.

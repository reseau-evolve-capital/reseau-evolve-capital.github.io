# Prompt Claude Design — Module « Saisie d'opérations & Quotes-parts »

> **À coller dans une session Claude Design.** Objectif : produire des fichiers **standalone HTML auto-suffisants** (servis via `python3 -m http.server 8770`), chacun avec un **toggle LIGHT/DARK** global en haut de page. Mobile-first **375px** pour les écrans membres ; les écrans trésorier peuvent exploiter un format plus large mais doivent rester utilisables à 375px.
>
> Ce document est la **spec design** issue de l'audit du design system réel (`packages/design-system`, `packages/ui`) et de la navigation réelle (`apps/web`). Il prime sur les URLs illustratives du cahier des charges (cf. §0.3).

**Version** : 1.0 · **Date** : 2026-06-24 · **Source** : `CAHIER_DES_CHARGES_DESIGN.md` + audit code
**Prérequis de lecture** : ce fichier intégralement, puis `CAHIER_DES_CHARGES_DESIGN.md` pour les flows détaillés.

---

## 0. Audit de l'existant (résultat — à respecter strictement)

### 0.1 Système visuel (tokens réels — `packages/design-system/styles/tokens.css`)

**ZÉRO hex en dur dans tes maquettes.** Réutilise ces variables CSS (recopie le bloc `:root` + `[data-theme="dark"]` dans chaque standalone).

**Marque & accent**
- Accent unique : **jaune marque `--brand-yellow #FDC70C`** (texte d'accent : `--accent-ink #231F20`). C'est la SEULE couleur de marque pour les CTA primaires, l'état actif de nav, les éléments sélectionnés.
- Jaune clair `--brand-yellow-light #FFF33B`, orange `--brand-orange #F3903F`.
- **Rouge marque `--brand-red #E93E3A` = branding/logo UNIQUEMENT. JAMAIS pour une perte, un retard, un cash négatif.**

**Dataviz (signaux financiers)**
| Rôle | Token | Light | Dark |
|---|---|---|---|
| Positif (gain, cash entrant) | `--data-positive` | `#0A7A4D` | `#34D399` |
| Positif — fond teinté | `--data-positive-50` | `#E8F5F0` | rgba vert .14 |
| Négatif (perte, cash sortant) | `--data-negative` | `#C53030` | `#F87171` |
| Négatif — texte fort (AAA) | `--data-negative-strong` | `#991B1B` | `#FCA5A5` |
| Neutre / flat | `--data-neutral` | `#67686A` | `#A0A1A3` |
| Avertissement | `--data-warning` | `#D97706` | `#F59E0B` |
| Avertissement — texte fort | `--data-warning-strong` | `#92400E` | `#FCD34D` |

**Neutres** : `--n-0 #FFFFFF` → `--n-1000 #0E0C0D` (13 paliers).
**Sémantique** (déjà mappée light/dark) : `--bg`, `--bg-page`, `--card`, `--card-sub`, `--text`, `--text-sec`, `--text-ter`, `--border`, `--border-strong`, `--accent`, `--accent-ink`, `--overlay`.

**Rayons** : `--r-sm 6px` · `--r-md 10px` · `--r-lg 14px` · `--r-pill 9999px`.
**Ombres** : `--sh-card` (cartes) · `--sh-pop` (menus) · `--sh-modal` (modales) · `--sh-glow` (focus — `0 0 0 4px rgba(253,199,12,.30)`).
**Motion** : `--dur-fast 150ms` · `--dur-std 220ms` · `--dur-slow 320ms` ; respecte `prefers-reduced-motion`.

### 0.2 Typographie

- **Display** `'Tommy Soft'` (fallback `'Plus Jakarta Sans'`, system-ui) — titres + **chiffres-clés** (poids 800/900, `letter-spacing -0.02em`).
- **Body** `'Plus Jakarta Sans'`.
- **Mono** `'IBM Plex Mono'`.
- **Tous les montants/quantités** : `font-feature-settings: 'tnum','lnum'` (chiffres tabulaires, alignement vertical).
- **Format EUR FR obligatoire** : `1 234,56 €` (espace **insécable** U+00A0, virgule décimale, € suffixe). Négatif = `−` (U+2212), pas `-`. Valeur absente/invalide → `—`. (Référence d'implémentation : `formatEUR`, `formatPct`, composant `CurrencyAmount`.)

### 0.3 Navigation réelle & points d'entrée (mapping cahier → app)

⚠️ **Les URLs `/club/[slug]/…` du cahier sont illustratives.** L'app est *club-scopée par cookie* (`evolve_active_club`) ; il n'y a pas de slug dans le chemin. Voici le mapping réel à dessiner :

**Membre** — `Sidebar` (desktop) + `BottomNav` (mobile, barre basse 4 entrées) : `Tableau de bord` (`/dashboard`) · `Portefeuille du club` (`/portfolio`) · `Mes cotisations` (`/contributions`) · `Réseau des clubs` (`/reseau`). État actif = `bg-brand-yellow text-accent-ink` (sidebar) / `text-brand-yellow` (bottom nav).

**Trésorier / Président** — entrée supplémentaire **« Espace trésorier »** (icône `ShieldCheck`) → `/admin`, visible seulement si rôle staff sur le club actif. Sous-navigation par **onglets `AdminTabs`** en haut de la zone `/admin`.

| Écran cahier | Surface réelle à enrichir / créer | Entrée dans la nav |
|---|---|---|
| Ma quote-part (membre) | Enrichir le **héro `/dashboard`** + carte « Ma part » dépliable (pas de nouvel onglet) | Déjà visible à l'ouverture |
| Historique du club (membre) | Section `/dashboard` ou `/activite` (lecture seule, agrégée) | Lien « Voir l'activité » depuis dashboard |
| Tableau de bord ops (staff) | **Nouvel onglet** « Tableau de bord » sous `/admin` | Onglet AdminTabs |
| Nouvelle opération (staff) | `/admin/operations/nouvelle` (assistant) | **Actions rapides** du tableau de bord ops |
| Cotisations en attente / settlement | Enrichir `/admin/cotisations` (bloc « En attente ») | Bloc « En attente » du dashboard ops + onglet Cotisations |
| Vérification Matrice (temporaire) | `/admin/verification` | Onglet AdminTabs (masqué après migration) |
| Preview dual-mode | `/admin/quotes-parts` | Onglet AdminTabs |
| Mode de calcul des parts | **Section** dans `/admin/settings` existant | Paramètres → bloc « Mode de calcul » |

**Topbar** présente sur toutes les surfaces : libellé sync (« Synchronisé il y a N min »), `LocaleSwitcher` (FR|EN), `ThemeToggle` (🌓). Reproduis-la.

### 0.4 Composants existants à RÉUTILISER (ne pas réinventer)

Atoms : `Button` (variants `primary` jaune / `secondary` bordé / `ghost` / `danger` rouge dataviz ; tailles `sm/md/lg`, `lg` = 48px ≥44px cible) · `Input` · `Select` · `Radio` · `Checkbox` · `Switch` · `Badge` · `Pill` · `Icon` · `Spinner` · `Skeleton` · `InfoTip` (bulle `(i)`) · `ProgressBar`.

Molecules : **`KPICard`** (titre + icône `(i)` + grande valeur + `TrendBadge` optionnel + lien détail) · **`TrendBadge`** (`up`=▲ vert / `down`=▼ rouge dataviz / `flat`=— / `warn`=⚠) · **`CurrencyAmount`** (montant FR, tailles `sm…xl`, `xl`=héro 40→56px) · **`EmptyState`** (icône + titre + description + action) · **`FormField`** (label + `*` requis + help + erreur, a11y câblée) · **`SegmentedToggle`** (pill bascule, ex. Simple/OPCVM) · **`Stepper`** (fil d'étapes assistant) · **`ContributionStatusCard`** · **`CotisationMonth`** (cellule mensuelle frise) · **`AllocationDonut`** · **`SparklineMini`** · **`DataRow`** · **`NumberStat`** · **`Toast`**.

Organisms : **`SensitiveConfirmModal`** (confirmation à double/triple geste : ouverture + case d'acquittement + resaisie optionnelle — **à utiliser tel quel pour tout settlement irréversible**) · `Sidebar` · `BottomNav` · `AppTopbar` · `ContributionsTimeline` · `DashboardEvolutionChart` · `RegulariserList`.

### 0.5 Garde-fous non négociables (vérifiés au QA)

- **Jargon banni côté membre** : « ma part » (pas quote-part), « ma valeur » (pas NAV), « performance » (pas plus-value latente). **Jamais** PUMP / NASDAQ / OPCVM / PRU sur un écran membre.
- **Cash signé en couleur** : entrant `+` = vert (`--data-positive`), sortant `−` = rouge **dataviz** (`--data-negative`) — **jamais** le rouge marque.
- **3 taps max** pour une action courante trésorier (cotisation = type → formulaire → enregistrer).
- **Actions irréversibles** = badge ⚠ + libellé explicite + modale de confirmation (`SensitiveConfirmModal`).
- **4 états par écran** : *vide* (invitation à l'action, pas une erreur), *chargement* (skeleton), *rempli*, *erreur* (message + chemin de correction).
- **A11y AA** (AAA sur chiffres-clés : ma valeur, ma part, variation) ; focus `--sh-glow` visible ; cibles ≥44×44px ; navigation clavier complète ; `cursor: pointer` sur tout cliquable (tout cliquable non-`<button>/<a>` = `role="button"` + `tabIndex=0` + `onKeyDown`).
- **FR par défaut**, copy i18n-ready (pas de FR hardcodé profond dans la logique, mais le copy des maquettes est en FR).

---

## 1. Nouveaux tokens à proposer (couleurs d'opérations)

Le cahier demande des tokens couleur par type d'opération. **N'introduis pas de hex arbitraires** : mappe sur les primitives existantes. La couleur du **montant** reste pilotée par le **signe du cash** (vert/rouge dataviz) ; la couleur de **type** ne sert qu'au **chip d'icône** (pastille ronde derrière l'emoji/icône), en aplat teinté discret.

| Type | Icône | Chip d'icône (fond / glyphe) | Sens du cash |
|---|---|---|---|
| Cotisation | 💰 | `--data-positive-50` / `--data-positive` | `+` entrant (vert) |
| Achat | 📈 | `--data-neutral-50` / `--text-sec` | `−` sortant (rouge) |
| Vente | 📉 | `--data-neutral-50` / `--text-sec` | `+` entrant (vert) |
| Dividende | 🎁 | `--brand-yellow` 14% / `--accent-ink` | `+` entrant (vert) |
| Frais | 💸 | `--data-warning-50` / `--data-warning-strong` | `−` sortant (rouge) |
| Pénalité | ⚠️ | `--data-negative-50` / `--data-negative-strong` | selon contexte |

> Règle : **le chip donne l'identité du type, le montant donne le sens du cash.** Un achat a un chip neutre mais un montant `−233 229 €` rouge. Une vente a le même chip neutre mais un montant `+…` vert.

**Nouveaux composants à concevoir** (en cohérence avec l'existant) :
`OperationTypeSelector` (grille d'icônes) · `OperationForm` (formulaire adaptatif) · `CashDeltaBadge` (`+300 €` vert / `−5 000 €` rouge, signe explicite) · `CashBalanceCard` (solde + badge cohérence) · `PendingWaveCard` (vague de cotisations + CTA) · `OperationListItem` (ligne d'opération) · `MemberShareCard` (quote-part dual-mode) · `PartEvolutionChart` (courbe prix de part) · `DualModeTable` (comparatif Simple/OPCVM) · `VerificationDelta` (badge ✓/⚠) · réutilise `SensitiveConfirmModal` pour `SettlementConfirmModal`.

---

## 2. Écrans à livrer — par ordre de priorité strict

Pour **chaque** écran : livre les états **rempli**, **vide**, **chargement (skeleton)**, et **erreur** (si applicable). Annoter chaque état.

---

### P0-a — Tableau de bord opérations (trésorier)
**Surface** : nouvel onglet « Tableau de bord » sous `/admin`. Audience : trésorier + président.
**Objectif** : santé financière en un coup d'œil + accès aux actions en ≤1 tap.

**État rempli (de haut en bas)**
1. **`CashBalanceCard` — Solde espèces** (information #1, grande valeur `CurrencyAmount size=xl` display 800) :
   - Badge cohérence : `✓ Cohérent avec Bourse Direct` (vert `data-positive`) ou `⚠ Écart détecté` (warning) cliquable → écran vérification.
   - Sous-ligne `text-ter` : « Calculé il y a 3 min ».
2. **Actions rapides** — 4 boutons primaires accessibles **sans scroll**, cibles ≥44px : `[+ Cotisation] [+ Achat] [+ Vente] [+ Dividende]` (grille 2×2 sur mobile). → ouvrent l'assistant Nouvelle opération à l'étape 2 directement.
3. **`PendingWaveCard` — En attente de traitement** (mise en évidence si non-vide, bordure/teinte accent) : « 3 cotisations · 900 € · Vague du 16–22 juin » + CTA `[Traiter maintenant →]`.
4. **Dernières opérations** — liste `OperationListItem` compacte : chip type + libellé + membre + date + `CashDeltaBadge` (impact cash signé/coloré). Lien `[Voir toutes les opérations]`.

**État vide** : solde `0 €` + `EmptyState` « Aucune opération pour l'instant — enregistrez la première » avec action `[+ Nouvelle opération]`. Pas de bloc « En attente ».
**État chargement** : skeleton du `CashBalanceCard` (barre titre + grand bloc valeur) + 4 boutons en skeleton + 3 lignes skeleton.
**État erreur** : carte solde en erreur « Impossible de calculer le solde » + bouton `[Réessayer]` ; le reste du dashboard reste consultable (dégradation gracieuse).

---

### P0-b — Nouvelle opération (assistant 3 étapes)
**Surface** : `/admin/operations/nouvelle`. **≤3 taps** : type → formulaire → enregistrer.

**Étape 1 — `OperationTypeSelector`** : grille 2×3 de grandes cartes-icônes (≥44px, idéalement 96px) : Cotisation 💰 · Achat 📈 · Vente 📉 · Dividende 🎁 · Frais 💸 · Pénalité ⚠️. Chip coloré selon §1. Header « ← Quelle opération ? ». (Skippée si on arrive depuis une action rapide du dashboard.)

**Étape 2 — `OperationForm` (adaptatif)** — utilise `FormField` (label + `*` + help + erreur) :
- **Cotisation** : Membre `Select *` · Montant € `* (min 100 €)` · Date de réception `*` (date picker) · Référence virement · Notes.
- **Achat** : Titre (symbole Google Finance, ex. `NASDAQ:NVDA`) avec **auto-complétion / sélection depuis les positions** (saisie symbole = point critique mobile) · Nom auto-rempli · Quantité `*` · Prix unitaire EUR `*` · **Total calculé** affiché en grand avec **impact cash `−233 229 €` rouge AVANT validation** (`CashDeltaBadge`) · Date `*` · Devise (`Select`, défaut EUR) + Taux · Référence courtier.
- **Vente** : identique à Achat, mais total = impact cash **`+…` vert**.
- **Dividende** : Titre concerné `Select` (depuis positions) · Type (`Radio` : espèces / titres) · [espèces] Montant reçu € `*` · [titres] Nombre de titres `*` + Prix de référence € · Date `*`.
- Bouton primaire pleine largeur `ENREGISTRER` (≥48px). Le label « Titre/Quantité/Prix unitaire » — **pas** « Actif/Parts/PRU ».

**Étape 3 — Confirmation** : `✓ Opération enregistrée` + récap (type, membre, `CashDeltaBadge`, date) + **transition de solde `86 260 € → 86 560 €`** (ancien → nouveau, le delta en couleur) + actions `[Voir toutes les opérations]` `[Nouvelle opération]`.

**États** : *vide* = l'étape 1 est l'état initial. *Chargement* = bouton ENREGISTRER en `isLoading` (spinner, `aria-busy`) pendant l'enregistrement. *Erreur* = bandeau d'erreur **guidé** sous le champ fautif (ex. « Montant sous le minimum de 100 € — corrige le montant ») via `FormField error`, jamais d'erreur sans chemin de correction.

---

### P1 — Ma quote-part (membre, Mode Simple)
**Surface** : enrichissement du **héro `/dashboard`** (la grande valeur existe déjà) + carte « Ma part » dépliable. Mobile-first 375px. Audience : membre.
**Objectif** : « combien vaut ma part aujourd'hui » en 0 tap.

**État rempli**
- **MA VALEUR AUJOURD'HUI** = métrique principale, énorme, centrale (`CurrencyAmount size=xl`, display 800) : `2 847 €`. Impossible à rater.
- **MA PART DU CLUB** = secondaire : `14,28 %` (`pct`, plus petit).
- **Performance du club** : `ProgressBar` + `TrendBadge up` `+12,3 %` · libellé « depuis création ». Vert si positif, rouge dataviz si négatif, neutre si flat.
- **Mes cotisations** : « Total versé : 2 400 € » · « Prochain virement : 15 juil. ».
- Lien `[Voir mon historique ▼]`.
- **Zéro jargon, zéro symbole boursier.**

**État vide** (membre vient de rejoindre, pas encore de cotisation) : `EmptyState` rassurant « Ta part apparaîtra dès ta première cotisation » + éventuel rappel du prochain virement. Pas de `0 €` anxiogène seul.
**État chargement** : skeleton du grand chiffre (bloc) + lignes secondaires.
**État erreur** : « Impossible d'afficher ta valeur pour le moment » + `[Réessayer]` ; fallback `—`, **jamais** `NaN`/`undefined`.

> *(P4 reprend la variante **Mode OPCVM** du même écran — voir §P4-a.)*

---

### P2 — Settlement des cotisations (trésorier, Mode OPCVM)
**Surface** : enrichissement `/admin/cotisations` (bloc « En attente »). Audience : trésorier + président.
**Objectif** : valider les cotisations de la semaine et distribuer les parts.

**Vue liste (avant settlement)**
- En-tête vague : « Vague du 16 au 22 juin 2026 · 3 membres · 900 € total ».
- Liste de cartes membre : pastille 🟢 + Nom + `300 € · 18 juin`.
- **Bloc OPCVM** (visible seulement si club en mode OPCVM) : champ `Saisir la NAV de référence (vendredi)` + help « Depuis votre espace Bourse Direct » + « Prix de la part estimé : [Entrez la NAV pour calculer] ».
- CTA principal dont le **libellé dépend du mode** : `DISTRIBUER LES PARTS` (OPCVM) **ou** `CONFIRMER LES COTISATIONS` (Simple). Lien `[Voir les cotisations validées]`.

**Après saisie de la NAV** : NAV `382 874 € ✓` → **Prix de la part calculé `2,00 €/part`** (mis en valeur, encadré) → **Parts à distribuer** par membre (`Éric → 150 parts`…) → CTA `⚠️ CONFIRMER — DÉFINITIF` (variant `danger`/warning) avec texte « Cette action est définitive. Correction possible mais au prix actuel de la part. ». Le CTA ouvre **`SensitiveConfirmModal`** (acquittement de la case avant activation).

**Mode Simple** : pas de bloc NAV/parts — juste liste + bouton `CONFIRMER LES COTISATIONS`.

**États** : *vide* = `EmptyState` « Aucune cotisation en attente — tout est à jour 🎉 » (ton positif). *Chargement* = skeleton liste + calcul. *Erreur* = NAV invalide → message guidé « Saisis un montant valide depuis Bourse Direct » sous le champ.

---

### P3 — Preview dual-mode (trésorier)
**Surface** : `/admin/quotes-parts`. **Jamais visible des membres.**
**Objectif** : comparer les quotes-parts selon les deux modes en parallèle.

**État rempli** : `DualModeTable` — tableau dense mais lisible. Badge « Mode actif : Simple ». Colonnes `Membre | Simple | OPCVM`, deux lignes numériques par membre (% + €) :
```
Éric     14,28% / 2 847 €    14,12% / 2 824 €
Mehdi    14,28% / 2 847 €    13,95% / 2 790 €
```
La **colonne du mode actif est mise en valeur** (fond plus foncé `card-sub` ou badge « actif »). `InfoTip` : « La colonne OPCVM est un aperçu. Le mode actif est Simple. » Lien `[Changer le mode → Paramètres]`.

**États** : *vide* = « Aucun membre à afficher ». *Chargement* = skeleton de 5 lignes. *Erreur* = bandeau + `[Réessayer]`.

---

### P4-a — Ma quote-part (membre, Mode OPCVM)
**Surface** : variante du héro `/dashboard` quand le club est en mode OPCVM. 375px, **zéro jargon** (le mot « OPCVM » n'apparaît jamais).

**État rempli** :
- **MES PARTS** : `1 420 parts @ 2,00 €/part` (encadré).
- **MA VALEUR AUJOURD'HUI** : `2 840 €` (xl) + `+440 € depuis mon entrée` (`CashDeltaBadge` vert).
- **Évolution du prix de la part** : `PartEvolutionChart` — **une seule ligne**, pas de chandelier, pas d'axes complexes : `Jan 1,00 € ───── Auj 2,00 €`. Vert si en hausse.
- Lien `[Voir mon historique ▼]`.

**États** : identiques à P1 (vide rassurant, skeleton, erreur `—`).

### P4-b — Paramètres : Mode de calcul des parts (président)
**Surface** : **section ajoutée** dans `/admin/settings`. Président uniquement.

**État rempli** : bloc « MODE DE CALCUL DES PARTS » avec 2 `Radio` en langage courant (zéro jargon) :
- **Mode Solidaire (actuel)** — « Tous les membres partagent exactement la même performance. Simple et fédérateur. »
- **Mode Équitable** — « Chaque membre possède des parts calculées au prix du marché à sa date d'entrée. Plus juste pour les entrées décalées. » *(ne pas écrire « OPCVM » côté libellé président — le terme reste interne)*
- Avertissement ⚠ : « Changer de mode recalcule l'historique. Contactez l'équipe pour effectuer cette migration. »
- Le changement **n'est pas un simple toggle** : `[Enregistrer]` → ouvre `SensitiveConfirmModal` (confirmation modale), puis en V1 déclenche `[Contacter l'équipe →]` (pas de bascule automatique).

**États** : *chargement* = skeleton du bloc. *Erreur* = « Paramètres non enregistrés — réessaie ».

---

### Bonus (P2+) — Vérification Matrice vs Operations (écran temporaire)
**Surface** : `/admin/verification` (masqué après migration du club). Utilitaire, fonctionnel avant tout.

**État rempli** : « Dernière sync Matrice : 14h22 ». Trois blocs de comparaison `VerificationDelta` (Solde espèces / Cotisations / Transactions) :
```
SOLDE ESPÈCES   Matrice 86 272 €   Plateforme 86 260 €   Delta ⚠ −12 €   [Corriger →]
COTISATIONS     Matrice 47          Plateforme 47          Delta ✓ 0
TRANSACTIONS    Matrice 23 lignes   Plateforme 22 lignes   Delta ⚠ −1 ligne [Voir le détail →]
```
Delta 0 = badge ✓ vert ; delta ≠ 0 = badge ⚠ orange (warning, **jamais** rouge marque) + lien correction. Bouton « Désactiver la synchronisation Matrice » **désactivé tant qu'un delta ≠ 0**.

**États** : *vide/idéal* = tous deltas à 0 → message « Tout est cohérent. Vous pouvez désactiver la Matrice. » *Chargement* = « Comparaison en cours… ». *Erreur* = « Sync Matrice indisponible » + dernière heure connue.

---

## 3. Livrables attendus de la session Design

1. Un standalone HTML **par priorité** (ou groupés P0 / P1 / P2 / P3 / P4), chacun avec **toggle LIGHT/DARK** global et les **4 états** annotés.
2. Les **composants nommés** selon §1 (`OperationTypeSelector`, `CashDeltaBadge`, `CashBalanceCard`, `PendingWaveCard`, `OperationListItem`, `MemberShareCard`, `PartEvolutionChart`, `DualModeTable`, `VerificationDelta`).
3. Le bloc tokens (`:root` + `[data-theme="dark"]`) recopié de `tokens.css` — **aucun hex hors de ce bloc**.
4. Une note d'intégration confirmant le mapping §0.3 (où chaque écran s'insère dans la nav réelle).

## 4. Definition of Done (QA design)

- [ ] Light **ET** dark impeccables sur chaque écran (basculer avant de conclure).
- [ ] Mobile 375px sans débordement horizontal (écrans membres) ; trésorier utilisable à 375px.
- [ ] Zéro hex hors du bloc tokens ; accent = jaune marque ; perte/cash négatif = rouge **dataviz** (jamais `#E93E3A`).
- [ ] Zéro jargon sur tous les écrans membres (relire P1, P4-a).
- [ ] Flow cotisation ≤ 3 taps ; impact cash visible **avant** validation, nouveau solde **après**.
- [ ] Actions irréversibles : badge ⚠ + modale `SensitiveConfirmModal`.
- [ ] 4 états livrés et annotés par écran.
- [ ] Focus `--sh-glow` visible, cibles ≥44px, contrastes AA (AAA chiffres-clés).

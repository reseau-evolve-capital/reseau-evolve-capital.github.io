# Bannière de consentement RGPD — spécification

> **Référence visuelle (source de vérité) :** `REC/standalone-exports/Cookie Consent RGPD (standalone).html` — « **Variante A retenue** ». Servir via `python3 -m http.server 8770` puis ouvrir `http://localhost:8770/Cookie%20Consent%20RGPD%20(standalone).html`.
> **Gate de fidélité :** l'implémentation doit atteindre **≥ 97 % de ressemblance** avec cette référence (light **et** dark), validée par un agent QA visuel en boucle (cf. §6).

---

## 1. Principe & conformité

- **Opt-in strict** : la mesure d'audience est **désactivée par défaut** (Consent Mode v2 `denied`). Rien n'est tracké avant choix explicite, hors pings cookieless default-denied.
- **« Refuser » au même rang visuel que « Tout accepter »** (taille, poids, padding identiques — seule la couleur de fond diffère). Exigence CNIL : refuser doit être aussi simple qu'accepter.
- **« Personnaliser »** ouvre un panneau granulaire avec les catégories : **Nécessaires** (verrouillé, toujours actif) et **Mesure d'audience** (toggle → pilote `analytics_storage`).
- **Persistance** : choix stocké en cookie 1ʳᵉ partie, durée **≤ 6 mois**, puis re-demande. Un lien « Gérer mes cookies » (footer) rouvre la bannière.

---

## 2. Variantes à développer (toutes issues de la référence)

Chaque variante existe en **light** et **dark** (via `[data-theme]`), et possède son **état initial** + son **panneau granulaire** (Personnaliser déplié).

| Clé variante  | Description                                                                     | Layout boutons                                                        | Défaut ?                                  |
| ------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------- |
| **`compact`** | Carte étroite (~342 px) ancrée en bas (`cardSide` gauche/droite), non bloquante | **empilés** : `Tout accepter` / `Refuser` / `Personnaliser mes choix` | ✅ **défaut desktop** (ancrée **gauche**) |
| **`bar`**     | Barre basse pleine largeur, texte à gauche + boutons à droite                   | **en ligne** : `Personnaliser` · `Refuser` · `Tout accepter`          | —                                         |

> **Mobile** : quelle que soit la variante desktop, la bannière s'affiche en **carte basse pleine largeur** (boutons empilés pleine largeur), pour respecter les cibles tactiles ≥ 44 px.

**Panneau granulaire** (commun) : grid 2 colonnes `Refuser | Tout accepter` (boutons `width:100%`) + `Personnaliser mes choix` centré, au-dessus duquel s'affichent les toggles de catégories. Un **overlay/scrim** (opacité par défaut **55 %**, token `--overlay`) apparaît derrière quand le panneau est ouvert.

---

## 3. Tokens & specs exactes (relevées sur la référence)

Tous les tokens existent déjà dans `packages/design-system` (`.ec-scope`). **Aucun hex en dur** : utiliser les classes/variables générées.

### 3.1 Boutons (identiques sur toutes les variantes)

|            | Tout accepter (primary)                                          | Refuser (secondary)                                       | Personnaliser (tertiary)                                                                                            |
| ---------- | ---------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Police     | Plus Jakarta Sans 600, 14px, line-height 1                       | idem                                                      | Plus Jakarta Sans 600, **13.5px**                                                                                   |
| Padding    | `13px 22px`                                                      | `13px 22px`                                               | `13px 4px`                                                                                                          |
| Radius     | `10px` (`--r-md`, défaut `btnShape=arrondi` ; `pilule`=999)      | `10px`                                                    | —                                                                                                                   |
| Fond       | `--brand-yellow` `#FDC70C`                                       | `transparent`                                             | `none`                                                                                                              |
| Texte      | light `#231F20` (`--n-900`) · dark `#0E0C0D` (`--n-1000`)        | light `#231F20` · dark `#E9E6DE`                          | light `rgba(35,31,32,.42)` · dark `rgba(233,230,222,.4)`                                                            |
| Bordure    | `1px solid transparent`                                          | `1px solid` light `#E4E4DF` (`--border`) · dark `#2E2B28` | —                                                                                                                   |
| Déco       | —                                                                | —                                                         | `underline`, underline-color light `rgba(35,31,32,.22)` / dark `rgba(233,230,222,.25)`, `text-underline-offset:3px` |
| Transition | `150ms cubic-bezier(.2,0,0,1)` (`--dur-fast`/`--ease-std`)       | idem                                                      | `color/text-decoration-color 150ms`                                                                                 |
| Focus      | `:focus-visible → box-shadow: var(--sh-glow)` (anneau jaune 4px) | idem                                                      | idem                                                                                                                |

> **Égalité de prominence (CNIL)** : `Tout accepter` et `Refuser` partagent **exactement** police/taille/padding/radius. Le seul écart est le **fond** (jaune plein vs contour). À faire respecter et à tester.

### 3.2 Conteneur

- Carte : `background: var(--card)`, `border: 1px solid var(--border)`, `border-radius: var(--r-lg)` (14px) [carte] / coins hauts arrondis [sheet mobile], `box-shadow: var(--sh-modal)`.
- Compact : largeur ~342 px ; boutons en `flex column`, `gap:10px` ; `Personnaliser mes choix` en `display:block` centré dessous (`margin-top` léger).
- Bar : `flex row`, texte (titre + description) à gauche, cluster boutons à droite (`gap:12px`, `flex-shrink:0`).
- Overlay (panneau ouvert) : `background: var(--overlay)` à 55 % (configurable).

### 3.3 Contenu (copy FR — i18n requis)

- **Titre** : « Cookies & mesure d'audience » (ou repris tel quel de la référence).
- **Description courte** : « On mesure l'audience pour améliorer le site. Tu décides. »
- **Boutons** : `Tout accepter` · `Refuser` · `Personnaliser` (bar) / `Personnaliser mes choix` (compact).
- **Panneau** : `Nécessaires` (verrouillé, « toujours actifs ») · `Mesure d'audience` (toggle). Lien « Politique de confidentialité ».
- Tout le copy passe par i18n (`messages/fr.json` + `en.json` app ; objet `{fr,en}` vitrine). **Aucune string en dur** dans le composant `@evolve/ui`.

---

## 4. Switch de variante par variable d'environnement

Pour tester les versions :

```
NEXT_PUBLIC_CONSENT_BANNER_VARIANT = "compact" | "bar"     # défaut: "compact"
NEXT_PUBLIC_CONSENT_BANNER_SIDE     = "gauche" | "droite"  # défaut: "gauche" (compact uniquement)
```

- **Défaut desktop = `compact` ancrée à `gauche`, boutons `arrondi` (r=10), overlay 55 %** — conforme à `TWEAK_DEFAULTS` de la référence.
- Le composant lit la variable au runtime ; valeur inconnue → fallback `compact`.
- Les deux variantes sont **toutes deux développées et maintenues** (la variable ne fait que choisir l'affichage). Storybook expose une story par variante × thème × état (initial / panneau).

---

## 5. Câblage Consent Mode v2 (logique partagée)

1. **Inline `<head>`, avant le tag GA** (default denied) :
   ```js
   gtag('consent', 'default', {
     analytics_storage: 'denied',
     ad_storage: 'denied',
     ad_user_data: 'denied',
     ad_personalization: 'denied',
     wait_for_update: 500,
     region: ['FR', 'BE', 'LU', 'EU'], // + EEA
   })
   ```
2. **Au choix utilisateur** :
   - _Tout accepter_ → `gtag('consent','update',{ analytics_storage:'granted' })` + event `consent_updated{choice:'accept_all', analytics:'granted'}`.
   - _Tout refuser_ → aucun update (reste denied) + `consent_updated{choice:'reject_all', analytics:'denied'}`.
   - _Personnaliser_ → toggle « Mesure d'audience » mappe 1:1 sur `analytics_storage` ; `consent_updated{choice:'custom', …}`.
3. `ad_*` restent **toujours denied** (Google Signals OFF, pas de pub). `user_id` (app) **jamais** posé sans `analytics_storage:granted`.
4. **Ordre garanti** : `consent default` inline **avant** le chargement GA ; rendu de la bannière hydration-safe (lecture du cookie de choix avant affichage).
5. **Deux implémentations, une logique** : la fonction de pilotage `gtag('consent', …)` + lecture/écriture du cookie est un petit module partagé (vanilla, sans dépendance React) ; l'UI est dupliquée (app via `@evolve/ui`, vitrine autonome — voir §7).

---

## 6. Gate de fidélité visuelle (≥ 97 %) — boucle QA

L'implémentation **n'est pas « faite »** tant que la ressemblance avec la référence n'atteint pas **≥ 97 %**, en **light et dark**, pour la variante par défaut **et** la variante `bar`.

**Procédure (agent `qa-visual`) :**

1. Servir la référence sur `:8770` ; screenshot de chaque variante/thème/état (la réf est un canvas zoomable → cibler chaque artboard).
2. Servir l'implémentation (Storybook de `@evolve/ui` et/ou l'app), screenshots équivalents (même viewport, mêmes polices chargées).
3. Comparer (composition, tokens, typographie, espacements, ordre & prominence des boutons) → score de ressemblance.
4. Si < 97 % : lister les écarts précis (couleur/taille/espacement/police), corriger, **re-boucler** (max raisonnable d'itérations, journaliser).
5. Vérifier en plus : `Refuser` strictement aussi proéminent qu'`Accepter`, focus glow présent, `cursor: pointer` (passe `cursor-pointer.spec.ts`), nav clavier (Tab/Enter/Esc), `prefers-reduced-motion` respecté.

> Les polices MADE Tommy Soft sont gitignorées (licence) ; s'assurer qu'elles sont chargées pour la comparaison (sinon faux négatif sur la typo).

---

## 7. Contrainte d'implémentation : deux cibles

- **App (`apps/web`)** : composant dans `packages/ui` (présentationnel, copy via props, zéro dépendance i18n), monté dans le layout via un wrapper `apps/web/components/` qui injecte les traductions + la logique Consent Mode. Compose avec les primitives existantes (`Button`, `Switch`, `Dialog`).
- **Vitrine (`apps/vitrine`)** : **hors workspace pnpm**, ne consomme pas `@evolve/ui`. → implémentation **autonome** (composant local) partageant uniquement (a) les **tokens** (mêmes valeurs `.ec-scope`) et (b) le **module logique Consent Mode** (vanilla). Ajout **additif** — ne pas refactorer la vitrine ; confirmation owner avant de toucher ses fichiers de prod.

---

## 8. Accessibilité (rappel RGAA AA)

- Boutons natifs `<button>` (ou `role=button`+`tabIndex=0`+`onKeyDown`) ; cibles ≥ 44 px sur mobile.
- Focus visible `--sh-glow` partout ; `cursor: pointer` (couvert par la règle base du design-system).
- Panneau granulaire : `role="dialog"` + `aria-modal`, `Esc` ferme, focus trap, `Dialog.Title`/`Description`.
- `prefers-reduced-motion` : pas d'animation d'entrée/scrim si réduit.
- Annonce `aria-live` polie à l'apparition.

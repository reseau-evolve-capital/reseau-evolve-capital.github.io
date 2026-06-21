# Prompt Claude Design — Refonte « Espace trésorier › Cotisations » (V2)

> À coller dans Claude Design. Objectif : produire un fichier **standalone HTML auto-suffisant** (servi via `python3 -m http.server`), avec **toggle LIGHT/DARK** en haut de page, montrant les **deux modes** de l'écran cotisations trésorier.

---

## Contexte produit

Tu redessines l'écran **« Cotisations du club »** de l'espace trésorier d'**Evolve Capital**, une app de gestion de clubs d'investissement (membres, portefeuille, cotisations). Cet écran est aujourd'hui incompréhensible pour le trésorier : il voit des chiffres bruts et une frise « mer de rouge » sans savoir quoi conclure ni quoi faire.

La refonte transforme l'écran en **poste de pilotage** répondant à 3 questions : _Mon club est-il à jour ? Combien manque-t-il et qui relancer ? Que faire maintenant ?_

L'écran a **deux modes**, pilotés par un filtre « membre » en haut à droite :

- **Mode CLUB** (filtre = « Tous les membres ») → pilotage.
- **Mode MEMBRE** (filtre = un nom) → dossier de recouvrement individuel.

## Ce que tu dois livrer

Un seul fichier **standalone HTML** avec :

1. Un **toggle LIGHT/DARK** global en haut de page (les deux thèmes doivent être impeccables).
2. **Deux écrans empilés** (ou onglets internes) : « Vue club » et « Vue membre », pour visualiser les deux modes.
3. Desktop en priorité (≈1280px de large), avec une **sidebar gauche** fixe (navigation) — voir layout ci-dessous. Prévois aussi un aperçu mobile si tu peux.

## Système visuel (à respecter strictement)

**Marque & couleurs**

- Jaune marque **`#E9C46A`/jaune Evolve** : accent, statut « Payé », éléments de marque. **JAMAIS pour une perte.**
- Rouge **branding** `#E93E3A` : logo / marque uniquement. **Jamais** pour indiquer un retard/une perte.
- **Retard / négatif** = rouge **dataviz** `#C53030` (light) / `#F87171` (dark). C'est CE rouge pour « En retard » et les montants dus.
- Vert dataviz pour les signaux positifs (à jour, recouvrement élevé).
- Fonds : light = crème/blanc cassé ; dark = anthracite profond. Cartes surélevées avec ombre douce.

**Typographie**

- Titres : police display géométrique, bold, tracking serré.
- Chiffres-clés : grand, `font-feature-settings: 'tnum','lnum'` (chiffres tabulaires), poids 800.
- Montants en **euros format FR** : `1 234,56 €` (espace insécable, virgule décimale).

**Composants de référence** (style existant)

- **KPICard** : carte blanche/sombre, titre en gris (avec petite icône `(i)` ronde pour tooltip), grande valeur en dessous.
- **Badges de statut** : pastille + label (À jour = vert, En retard = rouge dataviz, En attente = gris).
- **Frise de cotisations** (mode membre uniquement) : grille mensuelle par année (années en colonnes décroissantes), chaque mois = une cellule arrondie avec icône (✓ payé jaune, ! retard rouge, • en cours gris, ◌ pointillé à venir, – avant arrivée). Conserve ce composant tel quel.

## Layout commun (les deux modes)

```
┌────────────┬───────────────────────────────────────────────┐
│  SIDEBAR   │  Topbar: "Synchronisé il y a 17 min"  [FR|EN] 🌓 │
│  Evolve    ├───────────────────────────────────────────────┤
│            │  Onglets: Tableau de bord · Membres · ▸Cotisations │
│ Tableau bord│            · Votes · Retours · Invitations · Param│
│ Portefeuille├───────────────────────────────────────────────┤
│ Cotisations │  H1 "Cotisations du club"      [Filtre membre ▾]│
│ Réseau      │                                                 │
│ ▸ Trésorier │  ← CORPS SELON LE MODE →                        │
│            │                                                 │
│ Club actif  │                                                 │
└────────────┴───────────────────────────────────────────────┘
```

## MODE CLUB (filtre = « Tous les membres »)

De haut en bas :

1. **Bandeau synthèse** (pleine largeur, fond légèrement teinté) — phrase en langage naturel, chiffres en gras :

   > « Ton club est à jour à **92 %**. **4 membres** cumulent **1 250 €** de retard, dont **Jean D.** (450 €) en priorité. »
   > Prévois aussi une variante « tout est à jour » (ton positif, ✓ vert) : « Tout le monde est à jour. Aucun retard à signaler. 🎉 »

2. **3 KPICards** côte à côte, chacune avec icône `(i)` de tooltip :
   - **Taux de recouvrement** → `92 %` (jauge ou anneau discret de progression en accent). Tooltip : « Part des cotisations attendues qui ont été payées (hors mois à venir). »
   - **En retard** → `1 250 €` avec sous-ligne `4 membres` en rouge dataviz. Tooltip : « Montant total dû par les membres en retard, et nombre de membres concernés. »
   - **Encaissé** → `181 400 €` (vert/neutre). Tooltip : « Argent réellement reçu sur la période. »

3. **Bloc « À régulariser »** (carte large, titre avec compteur `À régulariser · 4 membres · 1 250 €`) :
   - Liste de lignes, triées par montant dû décroissant. Chaque ligne :
     `[avatar/initiales]  Nom Prénom    ·   3 mois en retard    ·   450 €  (rouge)   [ Relancer ]`
   - La ligne entière est cliquable (hover visible) → ouvrirait le mode membre.
   - Bouton **Relancer** secondaire (≥44px de haut).
   - Montre aussi l'état **vide positif** (variante) : illustration légère + « Tout le monde est à jour 🎉 ».

> ⚠️ **Pas de frise en mode club.** La frise mensuelle n'apparaît qu'en mode membre.

## MODE MEMBRE (filtre = un nom, ex. « Jean Dupont »)

De haut en bas — on **ajoute** un dossier AU-DESSUS de la frise, sans rien retirer :

1. **En-tête membre** : Nom Prénom (grand) · « Membre depuis mars 2019 » · **badge statut** (ici « En retard », rouge dataviz).

2. **3 KPICards perso** (avec tooltip) :
   - **Recouvrement perso** → `83 %`.
   - **Montant dû** → `450 €` (rouge dataviz si > 0, sinon « À jour » vert).
   - **Valeur nette de la part** → `12 480,00 €` (carte accentuée, bordure jaune marque — c'est l'info patrimoniale, à mettre en valeur).

3. **Encart « À régulariser »** (visible seulement si en retard) : « 3 mois à régler · 450 € » + liste compacte des mois concernés (ex. Avril 2026, Mars 2026, Février 2026) + bouton **Relancer**.

4. **Frise mensuelle de cotisations** (CONSERVÉE, identique à l'existant) :
   - Légende en haut : 🟡 Payé · ⚪ En cours · 🔴 En retard · ◌ À venir · ▫︎ Avant son arrivée.
   - Grille par année (2026 → 2019), 12 cellules par an, icône par cellule.
   - Tooltip au survol d'une cellule (ex. « Mars 2025 : 150,00 € payés le 03/03/2025 »).

## Modale « Relancer » (à montrer aussi)

Petite modale centrée, déclenchée par le bouton Relancer :

- Titre « Relancer Jean Dupont ».
- Champ message **pré-rempli** (éditable) :
  > « Bonjour Jean, un rappel concernant tes cotisations en attente : Février, Mars et Avril 2026, soit **450,00 €** au total. Merci de régulariser dès que possible. — Le bureau d'Evolve Capital. »
- Boutons : `Annuler` (secondaire) · `Envoyer le rappel` (primaire jaune marque).

## Contenu de démo à utiliser

- Club : « Evolve Capital », 20 membres, synchro « il y a 17 min ».
- Taux recouvrement 92 %, En retard 1 250 € / 4 membres, Encaissé 181 400 €.
- Membres en retard : Jean D. (3 mois, 450 €), Awa K. (1 mois, 150 €), Marc L. (2 mois, 300 €), Sofia R. (2 mois, 350 €).
- Membre détaillé : Jean Dupont, membre depuis mars 2019, recouvrement 83 %, dû 450 €, valeur nette 12 480,00 €.

## Exigences transverses

- **Light ET dark parfaits** (vérifie le contraste des chiffres rouges/verts dans les deux thèmes — AAA sur les chiffres-clés).
- **Tout élément cliquable** a un `cursor: pointer` et un état hover/focus visible.
- Format monnaie FR strict (`1 250,00 €`, espace insécable).
- Le rouge « retard » est le rouge **dataviz**, jamais le rouge branding.
- Cibles tactiles ≥ 44px, focus visible.
- Auto-suffisant (CSS inline, aucune dépendance externe), servable en statique.

## Livrable

Un fichier `Cotisations Trésorier V2 (standalone).html` avec toggle light/dark, montrant : Vue club (avec état rempli + variante « tout à jour »), Vue membre (Jean Dupont en retard), et la modale de relance.

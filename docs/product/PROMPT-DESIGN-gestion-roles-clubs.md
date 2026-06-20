# Prompt Claude Design — Surfaces de gestion : désactiver un club · rôles · ClubSwitcher mobile

> **Usage :** copier le bloc « Contexte » + un écran à la fois dans Claude Design (qui connaît déjà le design system Evolve Capital). Générer **écran par écran**.
> **Référence produit :** `docs/product/RETOUR-REFLEXIONS-2026-06-20.md` §2 items 1, 5, 8 · `PRD-NETWORK-ADMIN.md`.
> **Référence visuelle nav RÉELLE :** captures `docs/product/nav-screens/` (à fournir en complément).
> **Sortie attendue :** HTML standalone auto-suffisant, **toggle LIGHT/DARK** en haut de page, responsive **desktop + mobile**.

---

## Contexte à donner à Claude Design

> Tu connais déjà le design system **Evolve Capital**. Respecte-le strictement :
>
> - **Tokens uniquement**, jamais de hex en dur (`bg-app`, `bg-card`, `border-border`, `text-text-pri/sec/ter`, `bg-brand-yellow-500`…).
> - **Rouge brand `#E93E3A` = branding uniquement.** Action destructive / sensible, statut « désactivé » → token **`--color-data-negative-500` (#C53030)**. Avertissement = `--color-data-warning`. OK = `--color-data-positive`.
> - **A11y RGAA AA** : `cursor: pointer` sur tout cliquable, cibles ≥ 44×44 px, focus visible.
> - **Light ET dark** : toggle en haut de page ; vérifie les deux thèmes.
> - **Réutilise l'ADN existant** : `MembersList`/`InvitationsTable`, `Badge`, `Button`, `Select`, `SensitiveConfirmModal` (avant/après + double confirmation + resaisie optionnelle), `Banner`, `EmptyState`, `Avatar`, `Dialog`/bottom-sheet, menu avatar de `AppTopbar`.
> - **Copy FR par défaut.**
> - **Ces écrans sont des sections du shell de l'app** (on garde sidebar + topbar + bottom-nav 4 onglets) — jamais d'app autonome.

---

## Écran 1 — Désactiver / réactiver un club (`/reseau/clubs/[id]`) — _network_admin_

> Sur la **fiche club** existante (onglet réseau « Clubs » actif), ajoute une **section « Statut du club »** (en bas, après Matrice/Paramètres/Rôles).
>
> - **Club actif (cas nominal) :** ligne « Statut : ✅ Actif » (`data-positive`) + texte explicatif « Les membres accèdent à la matrice et aux synchronisations. » + bouton secondaire **« Désactiver le club »** en token **`data-negative`** (pas rouge brand).
> - Au clic → **`SensitiveConfirmModal`** : titre « Désactiver {nom du club} ? », corps explicite **« Aucune donnée n'est supprimée. Les membres ne pourront plus consulter la matrice ni déclencher de synchronisation jusqu'à réactivation. »**, champ **« Raison (optionnel) »**, résaisie optionnelle du nom du club, boutons « Annuler » / « Désactiver » (`data-negative`).
> - **Club désactivé (cas alterné) :** bandeau `Banner` `data-negative` discret en haut de la fiche « Ce club est désactivé depuis le {date} — {raison}. » + section Statut affiche « ⛔ Désactivé » + bouton **« Réactiver le club »** (`data-positive`/brand). Les boutons « Relancer la sync » / « Changer la matrice » sont **désactivés** (avec tooltip « Club désactivé »).
> - Rends les **deux états** (actif / désactivé), desktop + mobile (sections empilées, sous-nav réseau en drawer).

---

## Écran 2 — Badge « Désactivé » dans la liste des clubs (`/reseau/clubs`)

> Sur le tableau des clubs existant, montre comment apparaît un club désactivé :
>
> - `Badge` « Désactivé » (`data-negative`, discret) à côté du nom.
> - Ligne légèrement atténuée (opacité réduite) mais **toujours lisible et cliquable** (l'admin doit pouvoir entrer pour réactiver).
> - Le KPI « Capital cumulé » **n'inclut pas** les clubs désactivés (note de bas de carte « hors clubs désactivés »).
> - Desktop (tableau) + mobile (cartes).

---

## Écran 3 — Éditeur de rôle d'un membre dans un club (`/admin/membres`) — _président / trésorier_

> Sur l'écran **Membres** de l'Espace trésorier (`MembersList`), ajoute la **gestion de rôle** :
>
> - Colonne **« Rôle »** : `Badge` (Membre / Trésorier / Président) + petit bouton/icône « Modifier » (visible pour le staff habilité).
> - Au clic → **`Dialog` « Modifier le rôle »** : nom du membre + `Select` de rôle (Membre / Trésorier / Président) + **encart d'avertissement** `data-warning` : _« Ce rôle a été défini manuellement et ne sera plus écrasé par la synchronisation Google Sheets. »_ (matérialise le flag `role_source = manual`) + boutons « Annuler » / « Enregistrer ».
> - **Cas « rôle issu de la feuille » :** avant modification, afficher une note discrète sous le badge : _« Défini via la matrice (PARAMETRAGES) »_ — pour expliquer l'origine actuelle et lever la confusion « comment je nomme un trésorier ? ».
> - **Garde anti-escalade visuelle :** un trésorier ne voit pas l'option « Président » s'il n'y est pas habilité (montre le `Select` restreint).
> - États : succès (toast), erreur (Banner). Desktop + mobile.

---

## Écran 4 — Gestion des rôles RÉSEAU (`/reseau/bureau`) — _network_admin_

> Onglet réseau « Bureau » actif. Écran **« Bureau du réseau »** listant les membres ayant un rôle réseau.
>
> - **En-tête :** titre + bouton primaire **« Ajouter au bureau »** (network_admin uniquement).
> - **Tableau** (style `MembersList`) : Membre (avatar + prénom) · **Rôle réseau** (`Badge` : Admin réseau / Bureau) · **Titre** (Président / Vice-président / Trésorier / Secrétaire, optionnel) · Actions (Modifier / Retirer).
> - **« Ajouter / Modifier » → `Dialog`** : `Select` membre (recherche) + `Select` rôle réseau + `Select` titre (optionnel) → s'appuie sur les RPC existantes `network_grant_role`.
> - **« Retirer » → `SensitiveConfirmModal`** (`network_revoke_role`) avec **garde-fou « dernier admin »** : si on tente de retirer le dernier `network_admin`, l'action est bloquée avec un message clair `data-warning`.
> - États empty / loading / error. Desktop + mobile (drawer sous-nav).

---

## Écran 5 — ClubSwitcher sur mobile (menu avatar + sélecteur) — _membre multi-club_

> Aujourd'hui le changement de club actif n'existe **que sur desktop** (pied de sidebar). À porter dans le **menu avatar de la topbar** (desktop ET mobile), visible **uniquement si le membre a ≥ 2 clubs**.
>
> - **Menu avatar (`AppTopbar`) :** montre les entrées existantes (Profil · Espace trésorier si staff · Votes · Déconnexion) + une **nouvelle entrée « Changer de club »** (icône type `Repeat`/`Building`) placée avant « Déconnexion ». Sous l'entrée, en discret, le **club actif courant**.
> - Au clic → **sélecteur de club** : bottom-sheet (mobile) / `Dialog` (desktop) titré « Changer de club » listant les clubs du membre :
>   - chaque item = nom du club + rôle dans ce club (`Badge` discret) ; **club actif coché / surligné** (`data-positive` ou accent brand).
>   - tap sur un autre club → ferme + (techniquement : pose le cookie club actif + recharge l'app).
> - **Cas mono-club :** AUCUNE entrée « Changer de club » (montre le menu sans cette option).
> - Rends : menu avatar ouvert (mobile + desktop) + le sélecteur ouvert (mobile bottom-sheet + desktop dialog), light + dark, cibles ≥ 44 px.

---

## Notes de cohérence (pour l'agent design)

- **`SensitiveConfirmModal`** existe déjà (avant/après + double confirmation + resaisie optionnelle) — réutilise-le pour désactiver un club et retirer un rôle réseau, ne réinvente pas de modale.
- **Statut « désactivé »** et **actions destructives** = token `data-negative`, jamais le rouge brand `#E93E3A`.
- L'éditeur de rôle club doit **expliquer l'origine** du rôle (feuille vs manuel) — c'est le cœur de la confusion à résoudre.
- ClubSwitcher : pas de nouvel élément de chrome permanent ; tout passe par le menu avatar déjà présent.

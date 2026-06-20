# Prompt Claude Design — Console Feedbacks (Réseau + Bureau de club) + Insights IA

> **Usage :** copier le bloc « Contexte » + un écran à la fois dans Claude Design (qui connaît déjà le design system Evolve Capital). Générer **écran par écran**.
> **Référence produit :** `docs/product/RETOUR-REFLEXIONS-2026-06-20.md` §2 item 9 · `PRD-NETWORK-ADMIN.md` (Phase 2, Zone 4 Intelligence).
> **Données existantes :** table `feedback` (type `bug|feature|question`, `message`, `screenshot_urls[]`, `page_route`, `ai_title`, `ai_severity` `blocking|annoying|minor`, `ai_summary`, `ai_category`, `status` `received|in_progress|done|closed`, liens `github_issue_url`/`notion_page_id`). Edge `feedback-dispatch` remplit déjà l'IA **par item**. **Nouveau :** `feedback.club_id` (dérivé de l'auteur) + un **digest IA agrégé**.
> **Référence visuelle nav RÉELLE :** captures `docs/product/nav-screens/` (à fournir en complément).
> **Sortie attendue :** HTML standalone auto-suffisant, **toggle LIGHT/DARK** en haut de page, responsive **desktop + mobile**.

---

## Contexte à donner à Claude Design

> Tu connais déjà le design system **Evolve Capital**. Respecte-le strictement :
>
> - **Tokens uniquement**, jamais de hex en dur : `bg-app`, `bg-card`, `border-border`, `text-text-pri/sec/ter`, `bg-brand-yellow-500`, etc.
> - **Rouge brand `#E93E3A` = branding uniquement.** Sévérité « bloquant », statut négatif, action sensible → token dataviz **`--color-data-negative-500` (#C53030)**. Avertissement = `--color-data-warning`. OK/résolu = `--color-data-positive`. Neutre/info = gris.
> - **Pas de signal anxiogène** : un feedback négatif n'est pas un drame visuel ; reste sobre et factuel.
> - **A11y RGAA AA** : `cursor: pointer` sur tout cliquable, cibles ≥ 44×44 px, focus visible, contrastes AA.
> - **Light ET dark** : toggle en haut de page ; vérifie les deux thèmes.
> - **Réutilise l'ADN existant** : `KPICard`, tableau type `MembersList`/`InvitationsTable`, `Badge`, `Button`, `Select`, `EmptyState`, `Banner`, slide-over/`Dialog`, `Avatar`.
> - **Copy FR par défaut.** Monnaie FR (`1 234,56 €`), dates relatives FR (« il y a 2 h »).

---

## NAVIGATION — à respecter IMPÉRATIVEMENT

> Ces écrans sont des **sections intégrées au shell de l'app**, pas des apps autonomes. Tu **gardes** la sidebar desktop (« ESPACE MEMBRE » + « Réseau » + « Espace trésorier ») et la bottom-nav mobile 4 onglets. Tu n'inventes **aucune** sidebar séparée.
>
> - **Console réseau** → vit dans `/reseau`, **nouvel onglet « Retours »** dans la sous-nav réseau (Vue d'ensemble · Clubs · Annuaire · Bureau · **Retours**). Sous-nav = **barre d'onglets horizontale desktop** / **drawer off-canvas mobile** (jamais une barre scrollable qui replie les labels).
> - **Console bureau de club** → vit dans `/admin` (Espace trésorier), **nouvel onglet « Retours »** dans `AdminTabs`.
> - Les **deux écrans partagent le même composant** ; seule différence : la console réseau a une **colonne/filtre « Club »** et voit tous les clubs ; la console club est **scopée à un seul club** (pas de filtre club).

---

## Écran 1 — Console feedbacks RÉSEAU (`/reseau/retours`) — _network_board & network_admin_

> Génère l'écran **« Retours des membres »**, dans le shell de l'app (sidebar « Réseau » actif + topbar), avec la barre d'onglets réseau, onglet **« Retours »** actif.
>
> **A. En-tête de contenu :** titre « Retours des membres » + sous-titre « Ce que les membres remontent à travers le réseau ». À droite : sélecteur de **période** (`Select` : 30 j / 90 j / Tout) + bouton secondaire **« Exporter »**.
>
> **B. Panneau « Synthèse IA » (le différenciateur — en haut, pleine largeur, `bg-card` avec accent discret) :**
>
> - Pastille « ✦ Synthèse IA » + période + bouton ghost « Régénérer ».
> - **3–4 phrases** de digest généré (ex. « Ce mois-ci, 23 retours. La friction principale concerne la **lisibilité du dashboard sur mobile** (7 mentions). 2 bugs bloquants sur la connexion PWA iOS. Tonalité globale positive sur les cotisations. »).
> - **Puces « À traiter en priorité »** : 2–3 items dérivés (titre court + compteur de mentions + badge type).
> - **Chips « Thèmes récurrents »** : 4–6 tags cliquables (ex. « Dashboard mobile · 7 », « Connexion · 4 », « Cotisations · 3 ») → filtrent la liste.
> - État `loading` du panneau = skeleton de 3 lignes. État « pas assez de données » = message sobre.
>
> **C. Bandeau KPI :** 4 `KPICard` — « Retours (période) », « Bugs » (dont badge « X bloquants » en `data-negative`), « Idées », « Taux de traitement » (% done/closed, en `data-positive`).
>
> **D. Mini dataviz (2 cartes côte à côte, repli en pile mobile) :**
>
> - Donut « Par catégorie » (UX, données, perf, admin, autre) — couleurs dataviz neutres, **pas** de rouge brand.
> - Barres « Volume par club » (top 5 clubs) — pour repérer un club qui remonte beaucoup.
>
> **E. Barre de filtres :** `Select` Type (Tous/Bug/Idée/Question) · `Select` Sévérité (bugs) · `Select` Statut (Reçu/En cours/Fait/Fermé) · **`Select` Club** (réseau uniquement) · champ recherche.
>
> **F. Tableau des retours** (style `MembersList`), colonnes :
>
> - **Retour** : `ai_title` (titre IA) en gras + 1 ligne de `message` tronquée + icône 📎 si captures.
> - **Type** : `Badge` (bug = neutre/rouge dataviz selon sévérité, idée = bleu, question = gris).
> - **Sévérité** (si bug) : `Badge` (Bloquant = `data-negative`, Gênant = `data-warning`, Mineur = gris).
> - **Club** : nom + initiale (réseau uniquement).
> - **Membre** : avatar + prénom (RGPD : prénom/initiale, jamais de montant).
> - **Date** : relative.
> - **Statut** : `Badge` cliquable / `Select` inline (Reçu → En cours → Fait → Fermé).
> - **Liens** : petites pastilles GitHub / Notion si présentes.
> - Ligne entière cliquable → ouvre le **slide-over détail** (écran 3).
>
> **G. États :** `empty` (« Aucun retour sur la période », illustration sobre) · `loading` (skeletons de lignes) · `error` (Banner réseau).
>
> Rends **desktop** (sidebar + tableau) ET **mobile** (filtres repliés dans un bouton « Filtrer », retours en **cartes empilées**, bottom-nav 4 onglets « Réseau » actif, sous-nav réseau en drawer).

---

## Écran 2 — Console feedbacks BUREAU DE CLUB (`/admin/retours`) — _trésorier & président de club_

> **Identique à l'écran 1**, mais :
>
> - Dans le shell `/admin` (sidebar « Espace trésorier » actif), barre `AdminTabs` avec onglet **« Retours »** actif.
> - **Scopée au club du bureau** : pas de filtre/colonne « Club », titre « Retours de ton club ».
> - Le panneau Synthèse IA résume **uniquement** les retours du club.
> - KPI et dataviz au périmètre du club (le donut « Par catégorie » reste ; remplace « Volume par club » par **« Volume par semaine »**).
> - Même tableau, même slide-over détail.
> - Rends desktop + mobile.

---

## Écran 3 — Détail d'un retour (slide-over / `Dialog`) — _partagé réseau & club_

> Panneau latéral (desktop) / plein écran (mobile) qui s'ouvre au clic sur une ligne.
>
> - **En-tête :** `ai_title` + `Badge` type + `Badge` sévérité + statut (`Select` modifiable : Reçu/En cours/Fait/Fermé).
> - **Métadonnées :** auteur (avatar + prénom), club, date, **page concernée** (`page_route` en mono), navigateur (`user_agent` discret, repliable).
> - **Message verbatim** du membre (bloc lisible, respecte les retours ligne).
> - **Captures** : galerie des `screenshot_urls` (miniatures cliquables → lightbox).
> - **Bloc « Analyse IA »** (`bg-card`, accent ✦) : `ai_summary` (diagnostic 2–3 phrases) + `ai_category`.
> - **Liens externes** : boutons « Voir l'issue GitHub », « Voir dans Notion » (si présents).
> - **Actions bas de panneau :** changer le statut, (optionnel) « Répondre au membre » (réutilise le canal Brevo d'accusé).
> - États dark + light.

---

## Notes de cohérence (pour l'agent design)

- Le panneau **Synthèse IA** est la valeur nouvelle : il doit être **visuellement premier** mais sobre (pas un encart criard). Pense « note du jour » plus que « dashboard analytics ».
- **Jamais le rouge brand** pour un bug/sévérité : uniquement `data-negative`.
- RGPD : on montre prénom + philosophie/contenu, **jamais** de montant ni de quote-part dans cet écran.
- Réutilise le pattern de la **fiche club** et de **`MembersList`** pour le tableau et le slide-over (déjà dans le design system).

# Prompt Claude Design — Système de vote anonyme

> Copier-coller ce prompt dans Claude Design. Le design system du projet est déjà connu.

---

Tu es Claude Design, le générateur de maquettes UI d'Anthropic. Tu connais le design system du projet Réseau Evolve Capital : tokens CSS Tailwind V4, palette brand (accent doré `#e8c96a` / `#c9a83e`), typographie MADE Tommy Soft, composants existants (`AppTopbar`, `BottomNav`, `SyncBanner`, `InfoTip`, `TrendBadge`, `ContributionsTimeline`). Génère les maquettes décrites ci-dessous en respectant scrupuleusement ce design system.

---

## TOKENS DE RÉFÉRENCE

**Dark**

- Fond app : `#0f1117`
- Card / surface : `#1a1d2e`
- Accent doré : `#e8c96a`
- Accent doré pressé : `#d4b558`
- Texte primaire : `#e8f0ff`
- Texte secondaire : `rgba(232,240,255,0.55)`
- Bordure : `#2a2d3a`
- Bordure active : `#e8c96a`
- Focus ring : outline 2px solid `#e8c96a`, offset 2px
- CTA primaire fond : `#e8c96a`, texte : `#0f1117`
- CTA désactivé fond : `#2a2d3a`, texte : `rgba(232,240,255,0.3)`
- Succès/positif : `#22c55e`
- Erreur/négatif : `#C53030` (jamais `#E93E3A` pour les états de données)
- Badge pill fond : `rgba(232,201,106,0.15)`, texte : `#e8c96a`

**Light**

- Fond app : `#f4f5f7`
- Card / surface : `#ffffff`
- Accent doré : `#c9a83e`
- Texte primaire : `#0f1117`
- Texte secondaire : `rgba(15,17,23,0.55)`
- Bordure : `#e2e4ea`
- Bordure active : `#c9a83e`
- Focus ring : outline 2px solid `#c9a83e`, offset 2px
- CTA primaire fond : `#c9a83e`, texte : `#ffffff`
- CTA désactivé fond : `#e2e4ea`, texte : `rgba(15,17,23,0.35)`
- Badge pill fond : `rgba(201,168,62,0.12)`, texte : `#c9a83e`

**Typographie**

- Famille : MADE Tommy Soft (fallback : system-ui)
- Titre card : 16px medium
- Sous-titre / label : 13px regular, secondaire
- CTA : 14px semibold
- Badge pill : 11px medium, letter-spacing +0.3px

**Rayons**

- Card : 16px
- Bouton CTA : 10px
- Input / select : 8px
- Badge pill : 999px (full)
- Bannière : 12px

**Ombres (dark)**

- Card : `0 2px 16px rgba(0,0,0,0.4)`
- Modal : `0 8px 40px rgba(0,0,0,0.6)`

**Ombres (light)**

- Card : `0 1px 8px rgba(15,17,23,0.08)`
- Modal : `0 8px 40px rgba(15,17,23,0.16)`

---

## RÈGLES SYSTÉMIQUES (respecter dans 100 % des maquettes)

1. **Focus visible** : sur au moins un élément interactif par maquette, montrer le focus ring doré (outline 2px solid accent, offset 2px). Ne jamais supprimer le focus outline.
2. **Cibles tactiles** : tous les boutons, radios, checkboxes et CTA mesurent ≥ 44×44 px.
3. **Badge "🔒 Vote anonyme"** : pill dorée, visible en haut du modal de vote (PollVoteSheet) avant toute interaction. Texte : « 🔒 Vote anonyme ».
4. **Mention "Réponse définitive"** : ligne de texte secondaire juste au-dessus du CTA de confirmation, dans tous les états ready. Texte exact : « Votre réponse est définitive et ne pourra pas être modifiée. »
5. **Taux de participation** : affiché dans tous les états résultats, format « X/Y membres ont voté (Z%) ».
6. **Étiquette** : chaque maquette porte une étiquette visible en dehors du frame (coin supérieur gauche) au format `[Composant] — [desktop/mobile] — [état] — [dark/light]`.
7. **Ton sobre, financier, premium** : pas de couleurs flashy. L'accent doré est la seule couleur de marque forte. Les états négatifs utilisent `#C53030`, jamais `#E93E3A`.
8. **Icônes** : style line, 20px, stroke 1.5px. Utiliser les icônes Lucide (Vote, Check, Lock, ChevronRight, X, Calendar, Users, Plus, Trash2, Edit2, Bell).

---

## LIVRABLE 1 — PollBanner (bannière dashboard)

Contexte : la bannière s'insère dans la page `/dashboard`, au-dessus des KPI cards, sous l'`AppTopbar`. Fond légèrement teinté accent, bordure gauche 3px accent, radius 12px, padding 14px 20px.

**1a — Dashboard desktop — 1 vote ouvert — dark**
AppTopbar + PollBanner pleine largeur + KPI cards suggérées dessous. Bannière : icône `Vote` dorée + titre vote en gras (ex : « Faut-il diversifier vers les SCPI ? ») + type badge pill « Choix unique » + deadline pill « Clôture 20 juin » + CTA « Voter → » (fond doré, 44px min, radius 10px) + fermeture × ghost à droite. Focus ring visible sur le CTA.

**1b — Dashboard desktop — 2 votes ouverts — dark**
2 PollBanners empilées (8px gap). Vote 1 : « Faut-il diversifier vers les SCPI ? » / Choix unique. Vote 2 : « Êtes-vous disponible pour l'AG de septembre ? » / Oui/Non. Chaque bannière a son propre CTA.

**1c — Dashboard desktop — 3+ votes (bannière agrégée) — dark**
Une seule PollBanner : « 4 votes en attente de votre réponse » + CTA « Voir tous → » (lien textuel doré avec chevron).

**1d — Dashboard mobile (375px) — 1 vote ouvert — dark**
BottomNav visible en bas. Bannière full width, disposition 2 lignes + CTA pleine largeur.

**1e — Dashboard desktop — 1 vote ouvert — light**

**1f — Dashboard mobile — 1 vote ouvert — light**

---

## LIVRABLE 2 — PollVoteSheet (modal de vote, 4 types)

**Structure commune** : Desktop = modal centré max-width 480px, backdrop semi-opaque, header avec titre + badge pill « 🔒 Vote anonyme » + fermeture × (40×40px). Mobile = bottom sheet radius top 20px, handle bar 40×4px centré.

### Type `yes_no`

**2a — desktop — idle — dark**
Titre : « Faut-il diversifier vers les SCPI ? » + description 1 ligne. 3 options radio cards (Oui / Non / Abstention), height 52px, radius 10px, fond card, bordure 1px. Radio 24px non coché. CTA désactivé.

**2b — desktop — ready (« Oui » sélectionné) — dark**
Card « Oui » : fond teinté doré + bordure 2px dorée + radio coché. Mention définitive au-dessus du CTA. CTA actif, focus ring visible.

**2c — desktop — idle — light** · **2d — desktop — ready — light** · **2e — mobile — ready — dark**

### Type `single_choice`

**2f — desktop — idle — dark** : titre « Quel secteur prioriser pour Q3 ? », 4 options radio (Technologie, Immobilier, Énergie renouvelable, Santé). CTA désactivé.

**2g — desktop — ready (« Énergie renouvelable » sélectionné) — dark** · **2h — mobile — ready — dark**

### Type `multiple_choice`

**2i — desktop — idle — dark** : titre « Quels thèmes souhaitez-vous aborder en AG ? », 4 checkboxes (Gouvernance, Politique d'investissement, Bilan annuel, Nouveaux membres), checkbox 24×24px radius 4px. CTA désactivé.

**2j — desktop — ready (2 options cochées) — dark** : checkboxes cochées fond doré + coche blanche. Note 12px « Vous pouvez sélectionner plusieurs réponses. » Mention définitive + CTA actif.

**2k — mobile — ready — light**

### Type `short_text`

**2l — desktop — idle — dark** : encadré avertissement (bordure gauche 2px dorée) « Votre réponse sera visible de l'équipe sous forme anonyme. Votre nom n'y sera pas associé. » Textarea 120px, placeholder, compteur « 0/280 » coin bas-droit. CTA désactivé.

**2m — desktop — ready (142 chars) — dark** : textarea avec texte, compteur « 142/280 », bordure active dorée, mention définitive, CTA actif.

**2n — mobile — ready — dark** · **2o — mobile — ready — light**

---

## LIVRABLE 3 — États post-vote

**3a — desktop — after_close — dark** : icône Check cercle vert 48px + titre « Vote enregistré » + sous-titre. Pill « ⏳ Résultats disponibles à la clôture le 20 juin » (fond doré très faible, texte doré). CTA « Fermer » ghost full width.

**3b — mobile — after_close — dark** · **3c — desktop — after_close — light**

**3d — desktop — live — dark** : icône Check vert + titre + barre de chargement shimmer 3px + texte « Chargement des résultats... »

**3e — mobile — live — dark**

---

## LIVRABLE 4 — PollResultsView

**Structure commune** : Header = titre + badge pill « Résultats » (fond `rgba(34,197,94,0.12)`, texte `#22c55e`). Pied = pill participation « X/Y membres ont voté (Z%) ».

**4a — desktop — yes_no — dark** : barres de progression full width, height 8px, radius 999px. Oui 67% = barre dorée pleine + point `●` doré + label « Option majoritaire ». Non 25% + Abstention 8% = barres secondaires (opacity réduite). Pied : « 12/12 (100%) ».

**4b — desktop — yes_no — light** · **4c — mobile — yes_no — dark**

**4d — desktop — single_choice — dark** : Énergie renouvelable 45% gagnant, Technologie 30%, Santé 15%, Immobilier 10%. Pied : « 10/12 (83%) ».

**4e — desktop — multiple_choice — dark** : Gouvernance 91%, Bilan annuel 82%, Politique 64%, Nouveaux membres 45%. Note : « Les % dépassent 100% car choix multiples. » Pied : « 11/12 (92%) ».

**4f — desktop — short_text — dark** : pas de barres, liste numérotée de 3 réponses anonymes + indicateur « ... 6 autres réponses ». Pied : « 9/12 (75%) ».

**4g — desktop — short_text — light**

---

## LIVRABLE 5 — Page /votes (liste membre)

**5a — desktop — onglet "En cours" — dark** : AppTopbar + titre « Votes » + sous-titre. Onglets « En cours (2) | Clôturés (4) » (actif = fond doré faible + texte doré + bordure bottom 2px). 2 PollCards :

- Card non votée : badge « 🗳️ À voter » doré + type + deadline + CTA « Voter → » fond doré en bas à droite.
- Card votée : badge « ✓ Voté » vert + texte secondaire « Résultats disponibles à la clôture » (icône Clock).

**5b — desktop — onglet "Clôturés" — dark** : 3 cards clôturées. Badge « Clôturé » + date + pill participation dorée + CTA « Voir résultats → » ghost accent. Une card avec pill « Vous n'avez pas participé » (fond `rgba(197,48,48,0.1)`, texte `#C53030`).

**5c — desktop — "En cours" — light** · **5d — mobile — "En cours" — dark** (375px, BottomNav visible) · **5e — mobile — "En cours" — light**

**5f — desktop — EmptyState — dark** : icône Vote 40px secondaire + titre « Aucun vote en cours » + sous-titre centré.

---

## LIVRABLE 6 — Espace admin /admin/votes

**6a — desktop — liste admin — dark** : sidebar admin gauche (item « Votes » actif, doré). Zone centrale : titre + CTA « + Nouveau vote » fond doré. Onglets En cours / Brouillons / Clôturés.

AdminPollRow vote ouvert : titre + type + deadline + mini-barre de participation (4px, dorée, ex « 7/12 = 58% ») + actions « Voir résultats » (ghost accent) + « Clôturer » (ghost rouge) + kebab (···).

Onglet Brouillons : 2 lignes — badge « Brouillon » + actions « Éditer » + « Publier → » (fond doré) + « Supprimer » (Trash2 rouge ghost).

**6b — desktop — liste admin — light** · **6c — mobile — liste admin — dark** (header admin sans sidebar, hamburger)

**6d — desktop — PollCreateForm step 1 — dark** : page max-width 640px centré. Breadcrumb. Titre « Nouveau vote ». Champ titre (height 48px) + textarea description. Grille 2×2 de type-cards (icône + label + description 12px), « Choix unique » sélectionné (bordure 2px dorée, fond teinté). Focus ring sur une card.

**6e — desktop — PollCreateForm step 2 (single_choice) — dark** : suite du formulaire en scroll. Section « Options de réponse » : 3 inputs avec poignée drag + Trash2 rouge ghost (valeurs : Technologie, Immobilier, Énergie renouvelable) + bouton « + Ajouter une option » dashed full width. Section « Paramètres » : 2 toggles (résultats après clôture activé, email désactivé) + date input J+7. Footer sticky : « Sauver brouillon » ghost + « Publier → » doré + note 12px.

**6f — desktop — PollCreateForm — light** · **6g — mobile — PollCreateForm — dark** (1 colonne pour les type-cards)

---

## LIVRABLE 7 — Entrée menu avatar

**7a — desktop — dropdown ouvert — dark** : AppTopbar, dropdown card 220px large radius 12px. En-tête : avatar 40px + nom + email. Entrées : Profil (icône User) / **Votes (icône Vote) + badge rouge « 2 » (cercle 20×20px) + fond `rgba(232,201,106,0.06)`** / séparateur / Déconnexion (texte `#C53030`). Focus ring sur « Votes ».

**7b — desktop — dropdown — dark — sans badge** (pas de vote en attente)

**7c — desktop — dropdown — light**

**7d — mobile — bottom sheet menu ouvert — dark** (375px) : même contenu en bottom sheet avec handle bar.

**7e — mobile — bottom sheet menu — light**

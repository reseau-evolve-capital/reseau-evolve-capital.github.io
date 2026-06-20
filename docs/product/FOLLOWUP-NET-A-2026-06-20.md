# Follow-ups NET-A (« Lancer un club ») — 2026-06-20

Suivis ouverts après les corrections du 2026-06-20 sur `feat/net-a-lancer-un-club`
(fix ClubSwitcher rôle/club-actif, déblocage ajout de club, anti-doublon matrice,
colonne date d'ajout, détection auto du bureau, actions destructives → network_admin).

Aucun n'est bloquant. Priorité décroissante.

---

## 1. ⭐ ClubSwitcher absent sur mobile (PRIORITAIRE)

### Problème

Le sélecteur de club actif (`ClubSwitcher`) n'est rendu **que sur desktop** : il est injecté
dans le **footer de la `Sidebar`**, et la sidebar est masquée sur mobile (`md:flex`).
Conséquence : **un membre multi-club sur mobile ne peut pas changer de club actif** — il reste
bloqué sur le club résolu par défaut (cookie `evolve_active_club`, sinon adhésion la plus récente).

Sur mobile, la navigation passe par `BottomNav` (3–4 onglets) + la topbar (logo + menu avatar) ;
le nom du club actif est affiché en lecture seule dans la topbar (`clubName`), sans moyen d'en changer.

### Ancrage code

- `apps/web/components/chrome/AppChrome.tsx`
  - `AppChromeSidebar` → `ClubSwitcher` monté en `footer` de `<Sidebar>` (desktop only).
  - `AppChromeTopbar` → `clubName={clubActif?.name}` (affichage seul, mobile + desktop).
  - `AppChromeBottom` → `BottomNav` (mobile).
- `apps/web/components/chrome/ClubSwitcher.tsx` — composant (Radix Select ; `null` si < 2 clubs ;
  au switch : `setActiveClub` cookie → `window.location.reload()`).
- Données déjà disponibles côté layout : `allClubs` (`getUserClubMemberships`) + `activeClubId`
  sont passés à `AppChromeSidebar` ; il suffit de les router aussi vers une surface mobile.

### Pistes (à arbitrer en brainstorming avant implé)

1. **Dans le menu avatar de la topbar (recommandé)** — ajouter une entrée « Changer de club »
   (ou un sous-bloc listant les clubs) dans `AppTopbar`, visible si ≥ 2 clubs. Cohérent avec les
   autres entrées (Profil/Admin/Votes/Déconnexion), pas de nouvel élément de chrome, fonctionne
   desktop ET mobile. Implique d'étendre l'API d'`AppTopbar` (packages/ui) avec un point d'extension
   « clubs » (liste + club actif + callback), ou de réutiliser le `ClubSwitcher` rendu dans le menu.
2. **Bouton/chip « club actif » cliquable dans la topbar mobile** ouvrant un bottom-sheet de sélection
   (réutilise le pattern Sheet déjà présent : PushOptInSheet/FeedbackSheet). Plus visible, mais ajoute
   un élément d'UI mobile.
3. **Onglet/section dédiée** — hors scope (trop lourd pour un simple switch).

**Reco** : option 1 (entrée dans le menu avatar) — moindre surface, parité desktop/mobile, données
déjà câblées. Vérifier a11y (cibles ≥ 44px, clavier) et le `window.location.reload()` au switch.

### Critères d'acceptation

- [ ] Membre multi-club sur mobile : peut changer de club actif et l'app recharge sur le nouveau club.
- [ ] Membre mono-club : aucun contrôle de switch (ni mobile ni desktop).
- [ ] Cohérence du club actif affiché (topbar) avec le club sélectionné.
- [ ] e2e : étendre `club-switcher.spec.ts` avec un viewport mobile.

---

## 2. Badge « votes » de l'avatar non scopé au club actif

`getOpenPolls` / `hasPollActivity` (layout) remontent les votes **de tous les clubs** du membre
via RLS, alors que la page `/votes` est scopée au **club actif** (`getMemberPolls(clubId)`).
→ Incohérence : la pastille/bannière peut signaler un vote d'un autre club que celui affiché sur
`/votes`. À harmoniser (scoper le badge au club actif, ou assumer le multi-club et le documenter).

Ancrage : `apps/web/app/(app)/layout.tsx` (activité votes), `apps/web/lib/data/polls.ts`
(`getOpenPolls` sans filtre club vs `getMemberPolls(clubId)`).

---

## 3. Vues RÉSEAU encore en EUR (multi-devises)

Le multi-devises a été propagé sur les écrans **membre** (dashboard/portfolio/cotisations via
`getActiveClubMembership().clubs.currency`), mais **pas sur l'espace réseau** :

- `NetworkClubsTable` formate valo/plafond en `formatEUR` (devise du club ignorée).
- `network_list_clubs()` ne renvoie pas `currency`.
- **KPI cumul réseau** = somme de valorisations de **devises mélangées** → faux si multi-devises.

À traiter : exposer `currency` dans `network_list_clubs`, formater par devise dans la table, et
décider du traitement du cumul réseau (conversion ? affichage par devise ? masquer le total ?).

---

## 4. Wizard ajout club — voie « invitation par email » différée

L'étape 3 (responsable) propose une voie « invitation par email » affichée **« Bientôt »**,
désactivée (NET-003 ne l'a pas implémentée). À implémenter pour provisionner un responsable
non encore présent dans la matrice. Ancrage : `AddClubWizard.tsx` (bloc `inviteSoon*`).

---

## Notes

- Détection du bureau (#NET-A 2026-06-20) : OK quand l'onglet PARAMETRAGES déclare
  Président(e)/Trésorier(e) avec des noms reconnus dans BASE. Sinon, le wizard retombe sur la
  désignation manuelle (comportement voulu).
- Le moteur IA réseau reste différé : voir `docs/product/FOLLOWUP-reseau-moteur-ia.md`.

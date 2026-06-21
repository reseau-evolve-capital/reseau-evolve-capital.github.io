# Spec — Refonte écran Espace trésorier › Cotisations

**Date** : 2026-06-21
**Statut** : design validé (brainstorming concerté product/dev/IA), avant plan d'implémentation.
**Écran** : `apps/web` → `/admin/cotisations` (`AdminCotisationsView`).
**Analyse amont** : `docs/product/ANALYSE-UX-ADMIN-COTISATIONS-2026-06-21.md`.

## 1. Problème

Le trésorier ne sait ni quoi conclure des chiffres, ni quoi faire. Trois causes :

- **Mer de rouge** — la frise « Tous les membres » propage le pire statut (`late > due > paid`) : un seul membre en retard rougit tout le mois pour le club. Sur 20 membres × 4 ans, presque tous les mois sont rouges → bruit, pas signal.
- **KPI trompeurs** — « Versements : 1000 » = nombre de cellules mois×membre (pas des paiements) ; « Total cotisé » additionne payé **et** dû ; « Versement moyen » mélange les deux.
- **Aucune action** — l'écran est une photo d'état, jamais un « à faire ».

## 2. Objectif

Transformer l'écran en **poste de pilotage** répondant aux 3 questions du trésorier :
est-ce que mon club est à jour ? combien manque-t-il et qui relancer ? que faire maintenant ?

## 3. Décisions actées

| Sujet       | Décision                                                                                                         |
| ----------- | ---------------------------------------------------------------------------------------------------------------- |
| Structure   | Une route, **deux modes** pilotés par le filtre `?membre=` (URL, `nuqs`).                                        |
| Vue CLUB    | Synthèse + 3 KPI recadrés + bloc « À régulariser ». **Pas de frise.**                                            |
| Vue MEMBRE  | Dossier de recouvrement + **frise conservée telle quelle**.                                                      |
| Synthèse    | **Déterministe** (gabarit à trous). Pas d'appel LLM.                                                             |
| Relance     | v1 = message **pré-rempli par gabarit déterministe**, éditable, envoi Brevo existant. Brouillon LLM = follow-up. |
| Anciens KPI | Retirés de la vue principale. _(Décision repli comptable : voir §7 question ouverte — défaut = supprimés.)_      |

## 4. Architecture

`AdminCotisationsView` rend conditionnellement selon `membershipId` :

```
membershipId == null  → <ClubCotisationsPanel/>   (mode CLUB)
membershipId != null  → <MemberCotisationsPanel/> (mode MEMBRE)
```

- `ContributionsTimeline` (frise) **n'est instanciée qu'en mode MEMBRE**.
- Pas de nouvelle table. Tout dérive de `contribution_months` + helpers existants.
- Réutilise : `deriveContributionStatus`, `deriveAmountDue` (`lib/data/contributionStatus.ts`), logique « impayé » de `MembersList` / `/admin`.

## 5. Mode CLUB

### 5.1 Bandeau synthèse (déterministe)

Gabarit à trous rempli avec les chiffres calculés. Ex. :

> « Ton club est à jour à **92 %**. **4 membres** cumulent **1 250 €** de retard, dont **Jean D.** (450 €) en priorité. »

Variantes : 0 retard (« Tout le monde est à jour 🎉 »), 1 membre, N membres. Aucun LLM, aucun montant inventé.

### 5.2 Trois KPI recadrés (avec tooltip `(i)`)

| KPI                      | Valeur                | Calcul                                                                           |
| ------------------------ | --------------------- | -------------------------------------------------------------------------------- |
| **Taux de recouvrement** | `92 %`                | mois `paid` ÷ mois dus exploitables (hors `future`, hors `exempt`/pré-adhésion). |
| **En retard**            | `1 250 € · 4 membres` | `Σ deriveAmountDue` par membre en retard + comptage membres.                     |
| **Encaissé**             | `181 400 €`           | `Σ amount` sur lignes `status='paid'` du club.                                   |

### 5.3 Bloc « À régulariser »

Liste nominative des membres en retard : `nom · nb mois en retard · montant dû · [Relancer]`.

- Trié par **montant dû décroissant**.
- Réutilise la dérivation « impayé » (`late`/`pending` ∨ `amount_due>0`) de `/admin`.
- `EmptyState` positif si 0 retard.
- Chaque ligne cliquable → ouvre le mode MEMBRE correspondant (set `?membre=`).

## 6. Mode MEMBRE (ne rien perdre)

Au-dessus de la frise existante, on **ajoute** ; on ne retire rien.

1. **En-tête membre** : nom · date d'adhésion · badge statut (À jour / En retard / En attente via `deriveContributionStatus`).
2. **3 KPI perso** (tooltip) : Recouvrement perso · Montant dû (`deriveAmountDue`) · **Valeur nette de la part** (carte existante intégrée au trio).
3. **Encart « À régulariser »** (si en retard) : liste des **mois concernés** + montant + bouton **Relancer**.
4. **Frise mensuelle CONSERVÉE** à l'identique (tooltips par cellule déjà présents via `buildMonthTooltip`).

Résultat : le trésorier conserve 100 % de l'info actuelle + gagne le « quoi faire ».

## 7. Relance (v1 déterministe)

- Bouton `Relancer` (bloc « À régulariser » club + encart membre) → **modale** avec message **pré-rempli par gabarit** : nom, mois concernés, montant dû, devise, ton du club.
- Message **éditable** avant envoi.
- Envoi via le pipeline **Brevo/Edge existant** (E-NTF).
- Hook follow-up documenté `relance-ia` : remplacer le gabarit par un brouillon LLM (unique appel LLM de la feature). Aucune refonte nécessaire — même point d'entrée.

## 8. Composants & data

- **`KPICard`** (`packages/ui`) : ajout prop optionnelle `hint?: string` → icône `(i)` + popover. Réutilisable partout. Aucune dépendance i18n dans le package (copy via prop).
- **`lib/data/admin.ts`** : nouvelles fonctions pures `computeRecoveryRate`, `computeEncaisse`, `buildRegulariserList` (nominatif). Testables isolément.
- **Nouveaux organisms** (`packages/ui` si présentationnels, sinon `apps/web/components`) : `ClubCotisationsPanel`, `MemberCotisationsPanel`, `RegulariserList`, `RelanceModal`.
- Respect tokens design-system (jaune marque ≠ rouge perte ; rouge dataviz `--color-data-negative-500`). Pas de hex en dur.

## 9. Accessibilité

- Icône `(i)` des tooltips : focusable, clavier, `aria-describedby`.
- Lignes « À régulariser » cliquables : `role="button"` + `tabIndex` + `onKeyDown` (ou `<button>`).
- Bouton Relancer ≥ 44×44 px sur mobile.
- AA mini, AAA sur les chiffres-clés (taux, montant dû). `cursor: pointer` couvert par la règle globale.
- Test `cursor-pointer.spec.ts` à repasser vert.

## 10. Tests (couche la plus basse)

| Couche           | Cible                                                                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Unité (Vitest)   | `computeRecoveryRate`, `computeEncaisse`, `buildRegulariserList`, gabarit synthèse, gabarit relance (cas 0/1/N retards, pré-adhésion, futur). |
| Storybook play   | `RegulariserList` (tri, empty, clic→membre), `KPICard` avec `hint`, `RelanceModal` (édition, validation).                                     |
| E2E (Playwright) | bascule club↔membre, ligne « À régulariser » → ouvre membre, envoi relance (mock Brevo).                                                      |
| A11y             | axe sur les deux modes (club + membre), light & dark.                                                                                         |
| Visuel           | rendu light/dark + parité fr/en sur les deux modes.                                                                                           |

## 11. Hors périmètre (follow-ups)

- Brouillon de relance **généré par LLM** (`relance-ia`).
- Frise de proportion club (option écartée au profit du recentrage par mode).
- Historique des versements daté / fiche 360 membre (option écartée au profit du dossier de recouvrement ciblé).
- Export comptable.

## 12. Question ouverte

Faut-il conserver les anciens KPI (Total cotisé / Versements / Moyenne) derrière un repli « détail comptable », ou les supprimer ? **Défaut retenu : supprimés** (trompeurs). À trancher à la revue du spec.

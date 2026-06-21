# Analyse UX — Espace trésorier › Cotisations

**Date** : 2026-06-21
**Périmètre** : écran `apps/web` → `/admin/cotisations` (`AdminCotisationsView`), vue « Cotisations du club ».
**Mandat** : expliquer chaque élément affiché, proposer des tooltips, et — côté product designer — proposer des éléments à remonter pour rendre la page **actionnable** pour le trésorier.
**Contrainte** : aucune modification de code. Rapport uniquement.
**Concertation** : product designer (UX, lisibilité, friction) + lead dev (faisabilité, ce qui existe déjà) + expert usage IA (automatisation, aide à la décision).

---

## TL;DR

Le trésorier ne sait pas quoi conclure parce que l'écran lui montre **des chiffres bruts et une frise « mer de rouge »**, sans jamais répondre aux 3 questions qu'il se pose réellement :

1. **Est-ce que mon club est à jour ?** (taux de recouvrement)
2. **Combien manque-t-il, et qui dois-je relancer ?** (montant en retard + liste de noms)
3. **Que dois-je faire maintenant ?** (action)

Trois défauts de fond expliquent l'incompréhension :

- **A — La frise agrégée « Tous les membres » est trompeuse** : un seul membre en retard sur un mois suffit à colorer **tout le mois en rouge** pour le club entier. Sur 20 membres et 4 ans d'historique, presque tous les mois deviennent rouges → l'œil lit une catastrophe permanente qui n'en est pas une.
- **B — Les 3 KPI sont mal nommés / mélangent payé et dû** : « Versements : 1000 » ne compte **pas des paiements** mais des **lignes mois × membre** ; « Total cotisé » additionne aussi des montants **dus non versés** ; « Versement moyen » mélange les deux. Aucun de ces chiffres n'est interprétable seul.
- **C — Aucune action n'est proposée** : l'écran est une photo, pas un poste de pilotage. Le trésorier voit un état, jamais un « à faire ».

Les briques pour corriger existent déjà dans le code (`deriveContributionStatus`, `deriveAmountDue`, `MembersList` admin avec son filtre « à régulariser »). Le chantier est surtout **product/copy**, pas technique.

---

## 1. Décodage — ce que voit le trésorier aujourd'hui

### 1.1 En-tête & filtre

| Élément                         | Ce que c'est réellement (code)                                                                                                                                                          |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **« Cotisations du club »**     | Titre statique (`t('cotisations.title')`).                                                                                                                                              |
| **Filtre « Tous les membres »** | Sélecteur (`nuqs`, état en URL `?membre=`). `Tous les membres` → agrégat club ; un nom → vue d'un seul membre. En vue membre, une carte bonus **« Valeur nette de la part »** apparaît. |

### 1.2 Les 3 cartes KPI

Source : `computeContribStats(amounts)` sur les lignes `contribution_months` du filtre courant (`apps/web/lib/data/admin.ts`).

| Carte               | Libellé écran  | Calcul réel                          | Ce que le trésorier croit lire  | Ce que c'est vraiment                                                                                                     |
| ------------------- | -------------- | ------------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Total cotisé**    | `196 623,63 €` | `Σ amount` de toutes les lignes mois | « argent encaissé »             | **Σ des montants, payés ET dus** (le champ `amount` = « montant versé **ou** dû »). Inclut donc des sommes jamais reçues. |
| **Versements**      | `1000`         | `count` = nombre de lignes mois      | « nombre de paiements »         | **Nombre de cellules mois × membre** (~20 membres × ~50 mois ≈ 1000). N'a rien à voir avec un nombre de versements.       |
| **Versement moyen** | `196,62 €`     | `total / count`                      | « versement moyen d'un membre » | **Montant moyen par cellule-mois**, mélangeant payé et dû. Statistiquement creux.                                         |

> 🔴 **Diagnostic** : les trois libellés induisent en erreur. « 1000 versements » est le plus dcommageable — c'est un artefact technique (taille du tableau), pas une métrique métier.

### 1.3 La légende & la frise

Statuts **dérivés contextuellement** (`deriveVariant`, `apps/web/lib/data/contributions.ts`), pas le statut brut de la base :

| Pastille                | Variante         | Règle de dérivation                                       |
| ----------------------- | ---------------- | --------------------------------------------------------- |
| 🟡 **Payé**             | `paid`           | `status = paid`                                           |
| ⚪ **En cours**         | `pending`        | `status = due` **et** mois courant (`due` → « en cours ») |
| 🔴 **En retard**        | `late`           | `status = late` (passé/présent uniquement)                |
| ◌ **À venir**           | `future`         | mois strictement futur de l'année en cours                |
| ▫︎ **Avant ton arrivée** | `not_applicable` | mois antérieur à l'adhésion **du membre filtré**          |

Chaque cellule a **déjà un tooltip riche au survol** (`buildMonthTooltip`) — ex. « _Mars 2025 : 150,00 € payés le 03/03/2025._ » / « _Avril 2025 : 50,00 € à régler._ ». **Bonne nouvelle** : le micro-niveau est déjà documenté. Le problème est au niveau **macro** (KPI + légende + agrégat).

> 🔴 **Le piège « Avant ton arrivée »** : ce libellé n'a de sens qu'en **vue membre individuel** (joinedAt connu). En vue **« Tous les membres »**, `joinedAtYM = null` → cette catégorie ne s'applique jamais, mais elle reste affichée dans la légende. Le trésorier voit « Avant **ton** arrivée » sur une vue club : le « ton » est déroutant (de qui parle-t-on ?).

---

## 2. Pourquoi la frise « Tous les membres » est une mer de rouge

C'est le point le plus important du rapport.

L'agrégat club fusionne, pour chaque mois, tous les membres via une **priorité de gravité** (`aggregateMonthsByPeriod`, `MONTH_STATUS_RANK`) :

```
late  >  due  >  paid  >  exempt
```

→ **Si un seul membre sur 20 est en retard en avril 2024, la cellule « avril 2024 » du club entier devient rouge.**

Conséquence mécanique : avec 20 membres et un historique 2022→2026, la probabilité qu'**aucun** membre ne soit en retard sur un mois donné est quasi nulle. Donc **presque tous les mois passés sont rouges**, exactement ce qu'on voit sur la capture.

**Ce rouge n'est pas un signal — c'est du bruit.** Il ne dit pas « le club va mal », il dit « au moins une personne, un jour, n'était pas à jour sur ce mois ». Le trésorier ne peut rien en tirer :

- il ne sait pas **combien** de membres sont concernés,
- ni **qui**,
- ni **combien d'argent** est en jeu,
- ni si c'est **réglé depuis**.

> 💡 **Insight designer** : une frise mensuelle binaire est le bon outil pour **un membre** (« suis-je à jour mois par mois ? »). Elle est le **mauvais outil pour le club** (on perd la notion de proportion). Au niveau club, il faut une métrique de **proportion / recouvrement**, pas un statut binaire propagé par le pire élément.

---

## 3. Tooltips proposés (copy FR prêt à poser)

Mesure **non-bloquante, faible coût** : clarifier sans refondre. À mettre via une icône `(i)` à côté de chaque titre de KPI et de la légende.

### 3.1 Sur les cartes KPI

| Carte               | Tooltip proposé                                                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Total cotisé**    | « Somme de toutes les cotisations sur la période, **versées comme attendues**. Ce n'est pas le montant réellement encaissé — voir _Encaissé_ / _En retard_. »          |
| **Versements**      | « Nombre d'échéances mensuelles suivies (membres × mois). Ce n'est pas un nombre de paiements. » _(À terme : remplacer par un vrai compteur de versements — voir §4.)_ |
| **Versement moyen** | « Montant moyen par échéance mensuelle suivie. Mélange les mois payés et les mois dus. »                                                                               |

> ⚠️ Lead dev : `KPICard` n'expose aujourd'hui que `title` / `value` / `format`. Ajouter un tooltip demande **une petite prop optionnelle** (`hint?: string` + icône `(i)`) sur le composant `packages/ui`. Trivial, ~30 min, réutilisable partout.

### 3.2 Sur la légende

Préfixer la légende d'un libellé contextuel selon le filtre :

- Vue club : « **Code couleur du mois pour l'ensemble du club.** Un mois est rouge dès qu'**au moins un membre** est en retard ce mois-là. »
- Et renommer en vue club « Avant ton arrivée » → masquer cette entrée (non applicable au club) ou la nommer « Hors période ».

Tooltips par pastille (vue club) :

| Pastille     | Tooltip                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------- |
| 🟡 Payé      | « Tous les membres concernés ont cotisé ce mois-là. »                                       |
| ⚪ En cours  | « Mois en cours : cotisation attendue, pas encore close. »                                  |
| 🔴 En retard | « **Au moins un membre** est en retard sur ce mois. Survole / clique pour voir le détail. » |
| ◌ À venir    | « Mois futur : aucune cotisation encore due. »                                              |

---

## 4. Propositions product designer — rendre la page actionnable

L'objectif : transformer une **photo d'état** en **poste de pilotage**. Trois propositions, par ordre d'impact.

### Proposition 1 — Recadrer les 3 KPI sur des métriques décisionnelles (impact ⭐⭐⭐, coût moyen)

Remplacer le trio actuel (descriptif, trompeur) par un trio **orienté santé & action** :

| KPI proposé                 | Valeur                                                      | Source (déjà calculable)              | Pourquoi                                                        |
| --------------------------- | ----------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------- |
| **Taux de recouvrement**    | ex. `92 %` (mois payés ÷ mois dus, hors futur/pré-adhésion) | dérivable des `contribution_months`   | Le seul chiffre qui dit « est-ce que ça va ? » d'un coup d'œil. |
| **En retard**               | ex. `1 250 €` · `4 membres`                                 | `deriveAmountDue` + comptage `late`   | Le montant et le nombre de personnes à relancer = l'action.     |
| **Encaissé sur la période** | ex. `181 400 €`                                             | `Σ amount` filtré sur `status = paid` | Le vrai « argent reçu », distinct du dû.                        |

> Le « Total cotisé / Versements / Moyenne » actuel peut rester accessible en repli (« voir détail »), mais ne doit pas être la première chose vue.

### Proposition 2 — Bloc « À régulariser » sous les KPI (impact ⭐⭐⭐, coût faible)

Le chaînon manquant entre « il y a du rouge » et « voici quoi faire » : une **liste nominative des membres en retard**, avec montant dû et bouton de relance.

```
┌─ À régulariser (4 membres · 1 250 €) ───────────────┐
│  • Jean D.      3 mois     450 €   [ Relancer ]      │
│  • Awa K.       1 mois     150 €   [ Relancer ]      │
│  • …                                                 │
└──────────────────────────────────────────────────────┘
```

> 💡 Lead dev : l'espace `/admin` (membres) **a déjà** la logique « à régulariser » (`MembersList` + filtre impayé = `late`/`pending` ∨ `amount_due>0`, cf. sprint E-ADM). On peut **réutiliser / dériver** ce composant ici, ou simplement **lier** vers lui (« Voir les 4 membres à relancer → »). Pas de nouvelle requête lourde.

### Proposition 3 — Recadrer la frise selon le filtre (impact ⭐⭐, coût moyen)

- **Vue membre** (un nom filtré) : garder la frise mensuelle telle quelle — c'est son terrain naturel, claire et déjà bien faite.
- **Vue club** (« Tous les membres ») : remplacer la propagation « pire élément » par une **frise de proportion** — chaque cellule mois affiche le **taux de membres à jour** (dégradé jaune→rouge selon %), avec au survol « 18/20 à jour, 2 en retard ». On garde la lecture temporelle, on gagne la proportion, on tue la mer de rouge.

> Alternative légère si la frise de proportion est jugée trop coûteuse : en vue club, **garder le rouge mais l'annoter** — au survol d'un mois rouge, lister « 2 membres en retard : Jean D., Awa K. ». Le rouge devient alors un point d'entrée actionnable plutôt qu'un mur.

### Proposition 4 — Angle IA (impact ⭐⭐, à cadrer)

Expert usage IA — deux usages à faible risque, fort confort :

- **Synthèse en langage naturel** en tête de page : « _Ton club est à jour à 92 %. 4 membres cumulent 1 250 € de retard, dont Jean D. (450 €, 3 mois) à relancer en priorité. Le recouvrement s'est amélioré de 6 pts depuis mars._ » — généré à partir des chiffres déjà calculés, pas d'invention de données.
- **Brouillon de relance** : sur le bouton « Relancer », pré-rédiger l'email/message au membre (ton du club, montant, mois concernés). S'appuie sur le pipeline Brevo déjà en place (E-NTF).

> ⚠️ Garde-fou : toute synthèse IA doit être **dérivée déterministiquement** des chiffres affichés (pas d'hallucination de montants). À cadrer dans un brainstorming dédié avant tout dev.

---

## 5. Faisabilité — ce qui existe déjà (lead dev)

| Brique nécessaire               | Déjà présent ? | Référence                                                 |
| ------------------------------- | -------------- | --------------------------------------------------------- |
| Statut fiabilisé d'un membre    | ✅             | `deriveContributionStatus` (`contributionStatus.ts`)      |
| Montant dû dérivé               | ✅             | `deriveAmountDue` (× `min_contribution`)                  |
| Liste membres « à régulariser » | ✅             | `MembersList` + filtre impayé (`/admin`, E-ADM)           |
| Tooltip sur cellule de frise    | ✅             | `buildMonthTooltip`                                       |
| Tooltip sur KPI                 | ❌             | à ajouter (`hint?` sur `KPICard`, ~30 min)                |
| Taux de recouvrement / encaissé | ⚠️ dérivable   | filtrer `computeContribStats` sur `status='paid'` + ratio |
| Frise de proportion (vue club)  | ❌             | nouveau mode de rendu `ContributionsTimeline`             |

**Conclusion faisabilité** : les corrections **à fort ROI** (tooltips, recadrage des libellés KPI, bloc « à régulariser » par réutilisation) sont **peu coûteuses**. Seule la frise de proportion est un vrai chantier UI.

---

## 6. Recommandations priorisées

1. **Quick win (copy + petit composant)** — poser les tooltips KPI/légende du §3 et masquer « Avant ton arrivée » en vue club. Lève l'incompréhension immédiate sans toucher à la logique. _(Nécessite la prop `hint?` sur `KPICard`.)_
2. **Fort impact (réutilisation)** — recadrer les 3 KPI (§4.1) + ajouter le bloc « À régulariser » (§4.2) en réutilisant `MembersList`/`deriveAmountDue`. C'est ce qui transforme l'écran en outil de décision.
3. **Chantier UI** — frise de proportion en vue club (§4.3), ou a minima l'annotation des mois rouges (« qui est en retard »).
4. **À cadrer (brainstorming dédié)** — synthèse IA + brouillon de relance (§4.4).

> Aucune de ces pistes n'a été implémentée — ce document est un compte rendu d'analyse. Les propositions §4–§6 méritent un passage par le réflexe de concertation (brainstorming) avant tout dev, conformément au process projet.

# Preset « La Quote-Part » — gabarit de blocs de la newsletter

> Le preset n'est **pas** un schéma rigide : c'est un **ordre de blocs de départ** pour qu'Olivier
> parte d'un squelette pré-rempli plutôt que d'une page blanche. La newsletter reste un `Article`
> (`type = newsletter`) dont le `corps` est une dynamic zone — un format différent = d'autres blocs,
> sans migration. Cf. EDI-001 / EDI-002.

## Ordre des blocs (5 rubriques)

| #   | Bloc             | Contenu                                                     |
| --- | ---------------- | ----------------------------------------------------------- |
| 1   | `label-rubrique` | `ÉDITO`                                                     |
| 2   | `rich-text`      | Édito (prose, voix « nous » du comité)                      |
| 3   | `citation`       | Exergue (pull-quote)                                        |
| 4   | `separateur`     | filet                                                       |
| 5   | `label-rubrique` | `LE CHIFFRE`                                                |
| 6   | `le-chiffre`     | Infographie (claire + sombre) + légende + source + fallback |
| 7   | `separateur`     | filet                                                       |
| 8   | `label-rubrique` | `LA BOUSSOLE`                                               |
| 9   | `rich-text`      | Boussole (prose pédagogique, liste à marqueurs dorés)       |
| 10  | `separateur`     | filet                                                       |
| 11  | `label-rubrique` | `L'ÉTAGÈRE`                                                 |
| 12  | `etagere`        | 1 à 3 recommandations (titre, auteur, pourquoi)             |
| 13  | `separateur`     | filet                                                       |
| 14  | `label-rubrique` | `LE MOT DU RÉSEAU`                                          |
| 15  | `rich-text`      | Mot du réseau (prose courte)                                |
| 16  | `cta`            | « Voir ma quote-part » → `urlInterne: quote-part`           |

> En **email**, le mast « LA QUOTE-PART » + n° d'édition + date et le CTA final « Lire en ligne »
> (vers l'URL de l'article web) sont ajoutés par `NewsletterEmail` (EDI-005/006), **hors** dynamic
> zone — ils ne se saisissent pas comme des blocs.

## Dupliquer le preset (nouvelle édition)

1. Dans l'admin Strapi → **Article** → « Create new entry ».
2. `type = newsletter`, renseigner `numeroEdition` (obligatoire pour une newsletter — garde
   applicative, cf. block-contract.md), `datePublication`, `featuredImage` (sert d'image OG/partage).
3. Reproduire la séquence de blocs ci-dessus dans `corps` (ou dupliquer une édition existante puis
   remplacer les contenus).
4. Laisser en **brouillon** jusqu'à validation, puis **publier** (l'API publique ne sert que le publié).

## Contenu de référence — Édition n°01 « Évitons l'empressement. »

Le contenu complet et structuré vit dans le fixture **[`fixtures/edition-01.json`](./fixtures/edition-01.json)**
(forme API peuplée). Il sert à la fois d'exemple, de données de test (rendu web/email + parité,
EDI-007) et de source pour le seed Strapi (EDI-002).

Résumé éditorial (source : `REC/Phase2_Handoff/newsletter/PROMPT_email_template.md` §contenu d'exemple) :

- **Préheader** : « Le club des +1 000 Md$ se resserre. Et nous, on regarde. »
- **Titre** : « Évitons l'empressement. » · **Édition n°01** · Juin 2026
- **Édito** : 2 paragraphes FOMO + discipline long terme, référence Kobe Bryant. Exergue :
  « La vraie performance n'est pas celle qu'on regarde, c'est celle qu'on construit pendant qu'on dort. »
- **Le Chiffre** : infographie « club des +1 000 Md$ » — légende « 11 membres confirmés, 3 challengers
  à la porte. Source : données de marché, juin 2026. » · fallback « 1 000 Md$ : le seuil le plus
  exclusif du capitalisme. » (exactement **11 confirmés + 3 challengers**, cohérent avec l'infographie).
- **La Boussole** : 3 principes anti-FOMO (Ne jamais acheter au son du tambour / Mesurer le temps
  avant la vélocité / Se relire avant de réagir).
- **L'Étagère** : « One Up on Wall Street » (Peter Lynch) · « The Intelligent Investor » (Benjamin Graham).
- **Le mot du réseau** : deux nouveaux membres ce semestre, échéance de cotisation le 15 juillet.
- **Auteur** : Olivier Ouedraogo / Co-founder & Comité d'investissement.

> **Aucune donnée membre réelle** dans le seed/fixture (cf. CLAUDE.md).

## Images

Le fixture référence des médias placeholder (`/uploads/quote_part_01_cover.png`,
`/uploads/le_chiffre_01_clair.png`, `_sombre.png`). En réel, les visuels « Le Chiffre » sont produits
via `REC/Phase2_Handoff/newsletter/PROMPT_infographie_le_chiffre.md` (variante claire à fond baked
`#FAFAF9` + variante sombre) et uploadés dans Strapi. Le seed (`make strapi-seed`) génère des
placeholders pour satisfaire les champs média requis.

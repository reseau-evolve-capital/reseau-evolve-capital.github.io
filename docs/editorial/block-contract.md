# Contrat de blocs éditoriaux — `Article.corps` (dynamic zone)

> Source de vérité unique pour les renderers **web** (`apps/vitrine`, EDI-003) et **email**
> (`packages/data`, EDI-005). Toute évolution d'un bloc se reflète ici ET dans les deux renderers.
> Le content-type Strapi est défini en EDI-001 (`apps/cms/src/api/article` + `src/components/blocs/`).

## Forme de la réponse (Strapi 5, REST, aplatie)

Strapi 5 renvoie des documents **aplatis** (pas de wrapper `.attributes`). `apps/vitrine` utilise
`@strapi/client` qui renvoie déjà cette forme. L'article :

```jsonc
{
  "id": 12, "documentId": "abc…",
  "title": "Évitons l'empressement.",
  "slug": "evitons-l-empressement",
  "excerpt": "…",
  "type": "newsletter",            // "newsletter" | "article"
  "numeroEdition": 1,              // number | null (rempli pour les newsletters)
  "datePublication": "2026-06-…",  // ISO | null
  "auteurNom": "Olivier Ouedraogo",
  "auteurRole": "Co-founder & Comité d'investissement",
  "featuredImage": { "url": "…", "alternativeText": "…", "width": …, "height": …, "formats": {…} },
  "content": null,                 // legacy (blocks) — null pour les newsletters, utilisé par les vieux articles
  "corps": [ /* blocs ordonnés, voir ci-dessous */ ],
  "category": {…}|null, "author": {…}|null, "tags": [...],
  "locale": "fr", "publishedAt": "…"
}
```

### Média (Strapi 5 aplati)

- Média **single** peuplé = objet `{ url, alternativeText, width, height, formats } | null`.
- Média **multiple** peuplé = tableau de ces objets.
- `url` peut être **relatif** (`/uploads/…`) → préfixer via `getStrapiMediaUrl()` (`apps/vitrine/src/lib/api.ts`) avec `NEXT_PUBLIC_STRAPI_URL`. Côté email, l'URL DOIT être **absolue** (clients mail) → préfixer pareil.

### Populate requis (sinon `corps` revient vide / médias non peuplés)

```
GET /api/articles?filters[slug][$eq]=…&locale=fr&populate[corps][populate]=*&populate[featuredImage]=true&populate[author]=true
```

`populate[corps][populate]=*` peuple les médias **dans** chaque composant. Pour l'étagère
(`items` répétable) c'est couvert par `*`. (Le helper `getArticleBySlug` d'`api.ts` devra être
étendu pour ce populate profond — cf. EDI-003.)

## Discriminant

Chaque entrée de `corps[]` porte `__component` (string) + `id` (number) + ses champs.
Le `BlockRenderer` (web) et le mapper email **switchent sur `__component`**. Un `__component`
inconnu → **rien rendu + `console.warn`** (résilience, pas de crash). Ne JAMAIS throw.

## Les 9 blocs

| `__component`          | Champs                                                                                                                | Notes de rendu                                                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `blocs.label-rubrique` | `texte: string`                                                                                                       | Marqueur **carré doré** + texte **sombre**. JAMAIS jaune-sur-blanc (RGAA + design system).                                                                  |
| `blocs.rich-text`      | `contenu: BlocksContent` (blocks Strapi)                                                                              | Web : `@strapi/blocks-react-renderer` (déjà dép vitrine). Email : convertir blocks → `<p>/<strong>/<a>/<ul>` inline. Prose de marque côté web.              |
| `blocs.citation`       | `texte: string`, `attribution?: string`                                                                               | Bordure gauche dorée + italique.                                                                                                                            |
| `blocs.image`          | `image: Media`, `imageDark?: Media`, `legende?: string`, `alt: string` (requis)                                       | Web : `<picture>` (`source` dark = `imageDark` si présent, défaut `image`). Email : `image` seule (fond clair baked), `alt`, légende dessous.               |
| `blocs.galerie`        | `images: Media[]`, `legende?: string`, `disposition: "grille"\|"colonne"`                                             | Web : grille responsive (`grille`) ou colonne. Email : **pile verticale** (les grilles cassent en Outlook), 1 image pleine largeur + légende.               |
| `blocs.le-chiffre`     | `imageClaire: Media` (requis), `imageSombre?: Media`, `legende?: string`, `source?: string`, `fallbackTexte?: string` | Web : `<picture>` clair/sombre + légende + source. Email : `imageClaire` en `src`, `fallbackTexte` visible si image bloquée (pas de variante dark en mail). |
| `blocs.etagere`        | `items: { titre: string; auteur?: string; pourquoi?: string }[]`                                                      | Liste de recommandations.                                                                                                                                   |
| `blocs.cta`            | `libelle: string`, `url?: string`, `urlInterne?: "quote-part"\|"blog"\|"contact"\|"espace-membre"`                    | Résolution URL : `url` si présent, sinon mappe `urlInterne` (table ci-dessous). Email « Lire en ligne » = résolu dynamiquement (EDI-006), pas un bloc CTA.  |
| `blocs.separateur`     | `style: "filet"\|"espace"`                                                                                            | `filet` = `<hr>` discret ; `espace` = espacement vertical seul.                                                                                             |

### Résolution `urlInterne`

| clé             | cible                                               |
| --------------- | --------------------------------------------------- |
| `quote-part`    | `${APP_URL}` (espace membre — dashboard quote-part) |
| `espace-membre` | `${APP_URL}`                                        |
| `blog`          | `/blog` (vitrine)                                   |
| `contact`       | `/#contact` (vitrine)                               |

`APP_URL` = `https://app.reseauevolvecapital.com` (prod). Côté vitrine, exposer via une const.

## Règles transverses (web + email)

- **Light/dark** (web uniquement) : tokens du design system, `<picture>` pour les variantes. Email = clair baked (cf. `EvolveEmailShell`).
- **Interdits email** : `#FFF33B` (utiliser `#FDC70C`/dégradé), `#E93E3A` près d'un chiffre (perte = `#C53030`), webfont/`@font-face` (system fonts), emoji, `<script>`.
- **A11y** : `alt` obligatoire sur images, contraste AA, focus visible, marqueur rubrique jamais jaune-sur-blanc.
- **Parité de contenu** : un même `Article` rend les **mêmes textes/rubriques dans le même ordre** en web et en email. Seule la présentation diffère (police système, galerie en pile). Test imposé : EDI-007 #15.
- **États** : `corps` vide → état `empty` neutre ; média manquant / champ optionnel absent → rendu sans erreur (jamais `undefined`/`NaN` à l'écran).

## Validation applicative

- `type = "newsletter"` ⇒ `numeroEdition` non nul (Strapi ne l'impose pas au schéma ; garde applicative + test EDI-007 A.3 + garde d'envoi EDI-006).
- L'API publique ne sert jamais un brouillon (draftAndPublish natif Strapi).

## Types TS

- **Canonique partagé** : `packages/types/src/editorial.ts` (consommé par `packages/data` — email).
- **Miroir web** : `apps/vitrine/src/lib/api.ts` (la vitrine reste autonome, sans dép `@evolve/*`).
- Les types générés par Strapi vivent dans `apps/cms/types/generated/components.d.ts` (régénérés au boot).

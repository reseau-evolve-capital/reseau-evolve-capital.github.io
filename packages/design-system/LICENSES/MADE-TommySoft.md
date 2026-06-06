# Licence — MADE Tommy Soft

## Statut

⚠️ **À vérifier avant tout déploiement public.**

MADE Tommy Soft est une police commerciale créée par MADE Type.
Les fichiers `.otf` dans `assets/fonts/` ont été intégrés depuis l'export design.

## Checklist avant déploiement

- [ ] Vérifier que le client détient une licence valide pour usage web
- [ ] Vérifier que la licence couvre la redistribution via CDN/bundle
- [ ] Obtenir confirmation écrite du client

## Procédure d'installation manuelle (développeurs)

Les `.otf` sont exclus du repo git. Pour les installer :

1. Obtenir les fichiers auprès du responsable design
2. Les placer dans `packages/design-system/assets/fonts/` :
   - `MADE-TommySoft-Light.otf` (font-weight: 300)
   - `MADE-TommySoft-Regular.otf` (font-weight: 400)
   - `MADE-TommySoft-Medium.otf` (font-weight: 500)
   - `MADE-TommySoft-Bold.otf` (font-weight: 700)
   - `MADE-TommySoft-ExtraBold.otf` (font-weight: 800)
   - `MADE-TommySoft-Black.otf` (font-weight: 900)
3. `pnpm install` puis `pnpm --filter @evolve/ui storybook` pour vérifier

## Build & CI (repo PUBLIC → polices jamais committées)

`fonts.css` référence les `.otf` en `@font-face url()`, résolus AU BUILD par Turbopack :
un checkout propre (CI GitHub, déploiement, nouveau dev) échouerait sans eux.

`scripts/ensure-fonts.mjs` (exécuté en `predev`/`prebuild` d'apps/web et dans le job CI
`build`) garantit leur présence :

- `EVOLVE_FONTS_SRC=<dossier>` défini → copie les vraies `.otf` depuis ce dossier (rendu fidèle) ;
- sinon → stubs vides ⇒ le build passe et le **fallback Plus Jakarta Sans** s'applique au runtime.

**Déploiement avec le vrai rendu** : fournir `EVOLVE_FONTS_SRC` (artefact privé / secret CI),
jamais via git. En l'absence de licence confirmée, le fallback est le comportement par défaut.

## Lien

https://madetype.com (à confirmer avec le client)

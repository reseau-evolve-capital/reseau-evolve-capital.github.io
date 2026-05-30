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

## Lien

https://madetype.com (à confirmer avec le client)

#!/usr/bin/env node
/**
 * ensure-fonts — garantit la présence des polices MADE Tommy Soft attendues par
 * `packages/design-system/styles/fonts.css` (résolues AU BUILD par Turbopack via `url()`).
 *
 * Ces polices sont COMMERCIALES et exclues du dépôt par licence
 * (`packages/design-system/.gitignore`, repo PUBLIC → jamais committées). Sans elles,
 * un checkout propre (CI GitHub, futur déploiement Vercel, nouveau contributeur)
 * échoue au build (« Module not found … .otf »).
 *
 * Ce script rend le build reproductible partout :
 *   1. si `EVOLVE_FONTS_SRC` pointe un dossier contenant les `.otf` → les copie (rendu fidèle) ;
 *   2. sinon, crée des stubs vides pour les poids manquants → le build passe et le
 *      fallback « Plus Jakarta Sans » s'applique au runtime (cf. fonts.css).
 *
 * Une vraie police déjà présente (taille > 0) n'est JAMAIS écrasée.
 *
 * Pour un déploiement avec le vrai rendu : fournir les `.otf` via `EVOLVE_FONTS_SRC`
 * (artefact privé / secret CI), JAMAIS via git (licence + repo public).
 */
import { existsSync, mkdirSync, copyFileSync, writeFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const fontsDir = resolve(here, '..', 'packages', 'design-system', 'assets', 'fonts')
const WEIGHTS = ['Light', 'Regular', 'Medium', 'Bold', 'ExtraBold', 'Black']
const fileFor = (w) => `MADE-TommySoft-${w}.otf`

mkdirSync(fontsDir, { recursive: true })

const src = process.env.EVOLVE_FONTS_SRC
let kept = 0
let copied = 0
let stubbed = 0

for (const weight of WEIGHTS) {
  const dest = join(fontsDir, fileFor(weight))
  // Vraie police déjà là (non vide) → on garde.
  if (existsSync(dest) && statSync(dest).size > 0) {
    kept++
    continue
  }
  // Source configurée → copie la vraie police (rendu fidèle).
  if (src && existsSync(join(src, fileFor(weight)))) {
    copyFileSync(join(src, fileFor(weight)), dest)
    copied++
    continue
  }
  // Dernier recours : stub vide → build reproductible, fallback typo au runtime.
  writeFileSync(dest, '')
  stubbed++
}

console.log(`[ensure-fonts] gardées=${kept} copiées=${copied} stubs=${stubbed} → ${fontsDir}`)
if (stubbed > 0) {
  console.log(
    '[ensure-fonts] ⚠ Polices sous licence absentes : fallback Plus Jakarta Sans au runtime. ' +
      'Fournir EVOLVE_FONTS_SRC pour le rendu fidèle (voir packages/design-system/LICENSES/MADE-TommySoft.md).'
  )
}

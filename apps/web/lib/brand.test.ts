// Verrou de régression — logo de marque CLAIR partout (aucun `/logo.jpg` résiduel).
//
// Incident (juin 2026) : la migration vers le logo clair (tuile crème) n'avait touché
// QUE le chrome authentifié (`AppChrome.tsx`) + les assets PWA. Quatre surfaces — login,
// onboarding, pages légales, vérification d'attestation — pointaient encore l'ancien
// `/logo.jpg` (fond noir). Comme la PWA démarre sur `/dashboard` (chrome clair) mais que
// l'entrée navigateur est `/login`, l'utilisateur voyait « PWA claire / navigateur ancien ».
//
// Correctif : une SOURCE UNIQUE `BRAND_LOGO_SRC` (@/lib/brand) importée par toutes les
// surfaces. Ce test verrouille l'invariant :
//   1. `BRAND_LOGO_SRC` vaut bien l'icône claire 192px,
//   2. l'asset cible existe sur le disque,
//   3. AUCUN fichier source APPLICATIF de `apps/web` ni `packages/ui/src` ne contient le
//      littéral `/logo.jpg` HORS commentaires (réintroduction interdite). Les fichiers de
//      test/spec sont exclus : ils mentionnent légitimement le chemin (constante de comparaison).
//
// Portée : scan statique du code source (hors node_modules/.next/dist + fichiers *.test/*.spec).
// La preuve « au rendu » est doublée par l'e2e `playwright/brand-logo.spec.ts`.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { BRAND_LOGO_SRC } from '@/lib/brand'

const LEGACY_LOGO = '/logo.jpg'
const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx'])
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  'dist',
  'coverage',
  '.turbo',
  'storybook-static',
])
// Les fichiers de test/spec mentionnent légitimement `/logo.jpg` (constante de comparaison,
// ce garde lui-même, l'e2e brand-logo.spec.ts) — ce sont des assets de TEST, pas des surfaces
// de production. On les exclut : le garde ne vise QUE le code applicatif.
const TEST_FILE_RE = /\.(test|spec)\.(ts|tsx|js|jsx)$/

/** Remonte l'arborescence jusqu'à trouver `pnpm-workspace.yaml` (racine du monorepo). */
function findRepoRoot(startDir: string): string {
  let dir = startDir
  for (;;) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  throw new Error(`pnpm-workspace.yaml introuvable en remontant depuis ${startDir}`)
}

/**
 * Retire commentaires de ligne (`// …`) et de bloc (`/* … *\/`) pour ne pas faire échouer
 * sur une mention DOCUMENTAIRE de `/logo.jpg` (ex. la docstring de `@/lib/brand`). Suffisant
 * pour ce garde : on ne cherche qu'un littéral dans du CODE, pas une analyse syntaxique fine.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

/** Collecte récursivement les fichiers source à scanner sous `root`. */
function collectSourceFiles(root: string): string[] {
  const out: string[] = []
  function walk(dir: string): void {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) {
        if (!SKIP_DIRS.has(entry)) walk(full)
        continue
      }
      if (TEST_FILE_RE.test(entry)) continue
      if (SCAN_EXTENSIONS.has(extname(entry))) out.push(full)
    }
  }
  walk(root)
  return out
}

describe('garde anti-régression — logo de marque clair partout', () => {
  const repoRoot = findRepoRoot(process.cwd())

  it('BRAND_LOGO_SRC pointe l’icône claire 192px (tuile crème)', () => {
    expect(BRAND_LOGO_SRC).toBe('/icons/icon-192.png')
  })

  it('l’asset du logo de marque existe sur le disque', () => {
    const assetPath = join(repoRoot, 'apps', 'web', 'public', BRAND_LOGO_SRC)
    expect(existsSync(assetPath), `${assetPath} doit exister`).toBe(true)
  })

  it('l’ancien /logo.jpg a été supprimé', () => {
    const legacyPath = join(repoRoot, 'apps', 'web', 'public', 'logo.jpg')
    expect(existsSync(legacyPath), `${legacyPath} ne doit plus exister`).toBe(false)
  })

  it('aucun fichier source (apps/web, packages/ui/src) ne référence /logo.jpg hors commentaires', () => {
    const roots = [join(repoRoot, 'apps', 'web'), join(repoRoot, 'packages', 'ui', 'src')]
    const offenders: string[] = []
    for (const root of roots) {
      for (const file of collectSourceFiles(root)) {
        const code = stripComments(readFileSync(file, 'utf8'))
        if (code.includes(LEGACY_LOGO)) offenders.push(file.slice(repoRoot.length + 1))
      }
    }
    expect(
      offenders,
      `fichiers référençant encore ${LEGACY_LOGO} (utiliser BRAND_LOGO_SRC) :\n${offenders.join('\n')}`
    ).toEqual([])
  })
})

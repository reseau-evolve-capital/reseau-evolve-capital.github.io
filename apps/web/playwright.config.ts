import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { defineConfig } from '@playwright/test'

// URL de base surchargeable AU LANCEMENT via `E2E_BASE_URL` : quand :3001 est occupé par un
// autre service local (ex. conteneur Docker tiers), le dev server du checkout courant tourne
// sur un port alternatif (PORT=3011) et les specs ciblent ce port. Sans la variable, le
// comportement est strictement identique à avant (défaut :3001).
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3001'

/**
 * storageState consent : le fichier versionné ancre le localStorage sur l'ORIGINE
 * http://localhost:3001. Le localStorage étant scopé par origine, sur un port alternatif
 * il ne s'appliquerait plus → la bannière de consentement réapparaîtrait sur tous les
 * specs (superposition + clics interceptés). On dérive donc une copie temporaire HORS
 * repo (tmpdir) avec l'origine réécrite vers BASE_URL. Sans E2E_BASE_URL : fichier
 * versionné inchangé.
 */
function consentStatePath(): string {
  const source = path.join(__dirname, 'playwright', 'consent-state.json')
  if (!process.env.E2E_BASE_URL) return source
  const state = JSON.parse(fs.readFileSync(source, 'utf8')) as {
    origins?: Array<{ origin: string }>
  }
  for (const entry of state.origins ?? []) entry.origin = BASE_URL
  const port = new URL(BASE_URL).port || '80'
  const derived = path.join(os.tmpdir(), `evolve-consent-state-${port}.json`)
  fs.writeFileSync(derived, JSON.stringify(state, null, 2))
  return derived
}

export default defineConfig({
  testDir: './playwright',
  globalSetup: './playwright/global-setup.ts',
  fullyParallel: false,
  // Les specs partagent un unique membre seed (test@example.com) re-clé à chaque login ;
  // exécution sérielle (1 worker) pour éviter la course inter-fichiers sur cet état partagé.
  workers: 1,
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    // Consentement RGPD pré-résolu (localStorage) pour TOUS les specs : supprime la bannière
    // de consentement (sinon elle se superpose aux écrans) ET débloque la bannière PWA (gate
    // `useConsentResolved`). Le spec consent-banner.spec.ts override ce state (vierge) pour
    // tester le bandeau lui-même. Date 2099 → jamais expirée (cf. lib/consent/consent-storage).
    storageState: consentStatePath(),
  },
  webServer: {
    command: 'pnpm --filter @evolve/web dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})

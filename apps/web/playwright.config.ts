import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './playwright',
  globalSetup: './playwright/global-setup.ts',
  fullyParallel: false,
  // Les specs partagent un unique membre seed (test@example.com) re-clé à chaque login ;
  // exécution sérielle (1 worker) pour éviter la course inter-fichiers sur cet état partagé.
  workers: 1,
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    // Consentement RGPD pré-résolu (localStorage) pour TOUS les specs : supprime la bannière
    // de consentement (sinon elle se superpose aux écrans) ET débloque la bannière PWA (gate
    // `useConsentResolved`). Le spec consent-banner.spec.ts override ce state (vierge) pour
    // tester le bandeau lui-même. Date 2099 → jamais expirée (cf. lib/consent/consent-storage).
    storageState: './playwright/consent-state.json',
  },
  webServer: {
    command: 'pnpm --filter @evolve/web dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})

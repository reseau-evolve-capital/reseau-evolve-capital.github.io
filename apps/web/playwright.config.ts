import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './playwright',
  globalSetup: './playwright/global-setup.ts',
  fullyParallel: false,
  // Les specs partagent un unique membre seed (test@example.com) re-clé à chaque login ;
  // exécution sérielle (1 worker) pour éviter la course inter-fichiers sur cet état partagé.
  workers: 1,
  use: { baseURL: 'http://localhost:3001', trace: 'on-first-retry' },
  webServer: {
    command: 'pnpm --filter @evolve/web dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})

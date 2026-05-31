import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './playwright',
  globalSetup: './playwright/global-setup.ts',
  fullyParallel: false,
  use: { baseURL: 'http://localhost:3001', trace: 'on-first-retry' },
  webServer: {
    command: 'pnpm --filter @evolve/web dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})

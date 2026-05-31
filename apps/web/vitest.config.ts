import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  // Désactive PostCSS (non nécessaire pour les tests de routes API)
  css: {
    postcss: {},
  },
  resolve: {
    alias: {
      '@evolve/data': path.resolve(__dirname, '../../packages/data/src'),
      '@evolve/types': path.resolve(__dirname, '../../packages/types/src'),
      '@evolve/utils': path.resolve(__dirname, '../../packages/utils/src'),
      '@evolve/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@evolve/design-system': path.resolve(__dirname, '../../packages/design-system/src'),
    },
  },
  test: {
    environment: 'node',
    include: ['app/**/*.test.ts', 'app/**/*.test.tsx'],
  },
})

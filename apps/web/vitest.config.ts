import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  // Désactive PostCSS (non nécessaire pour les tests de routes API)
  css: {
    postcss: {},
  },
  resolve: {
    // Tableau d'alias (et non objet) : l'ordre compte et les `find` regex évitent qu'un alias
    // court (« @ ») n'avale les imports « @evolve/* ».
    alias: [
      { find: '@evolve/data', replacement: path.resolve(__dirname, '../../packages/data/src') },
      { find: '@evolve/types', replacement: path.resolve(__dirname, '../../packages/types/src') },
      { find: '@evolve/utils', replacement: path.resolve(__dirname, '../../packages/utils/src') },
      { find: '@evolve/ui', replacement: path.resolve(__dirname, '../../packages/ui/src') },
      {
        find: '@evolve/design-system',
        replacement: path.resolve(__dirname, '../../packages/design-system/src'),
      },
      // Alias racine de l'app (miroir du paths « @/* » de tsconfig) — résout @/lib, @/components…
      { find: /^@\/(.*)$/, replacement: path.resolve(__dirname, '.') + '/$1' },
    ],
  },
  test: {
    environment: 'node',
    include: ['app/**/*.test.ts', 'app/**/*.test.tsx', 'lib/**/*.test.ts', 'lib/**/*.test.tsx'],
  },
})

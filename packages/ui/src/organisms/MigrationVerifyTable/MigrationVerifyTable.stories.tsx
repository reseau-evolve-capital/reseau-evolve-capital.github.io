import type { Meta, StoryObj } from '@storybook/react'
import { expect, within } from 'storybook/test'
import {
  MigrationVerifyTable,
  type ClubVerifyData,
  type MigrationVerifyRow,
} from './MigrationVerifyTable'

// Fabrique une ligne de métrique : `ok` dérivé du delta (= operations - legacy) pour rester
// cohérent avec ce que l'app calcule réellement.
function row(
  key: string,
  metric: string,
  kind: 'cash' | 'count',
  legacy: number,
  operations: number
): MigrationVerifyRow {
  const delta = operations - legacy
  return { key, metric, kind, legacy, operations, delta, ok: delta === 0 }
}

// Club « tout cohérent » : les 3 deltas sont nuls.
const CLUB_OK: ClubVerifyData = {
  clubId: 'evolve',
  clubName: 'Evolve Capital',
  rows: [
    row('cash', 'Solde espèces', 'cash', 12_540.5, 12_540.5),
    row('contributions', 'Cotisations', 'count', 312, 312),
    row('transactions', 'Transactions', 'count', 87, 87),
  ],
}

// Club avec écarts : solde espèces et transactions divergent.
const CLUB_MISMATCH: ClubVerifyData = {
  clubId: 'lyon',
  clubName: 'Cercle Lyonnais',
  rows: [
    row('cash', 'Solde espèces', 'cash', 8_000, 7_850.25),
    row('contributions', 'Cotisations', 'count', 140, 140),
    row('transactions', 'Transactions', 'count', 51, 48),
  ],
}

const meta: Meta<typeof MigrationVerifyTable> = {
  title: 'Organisms/MigrationVerifyTable',
  component: MigrationVerifyTable,
  tags: ['autodocs'],
  args: { clubs: [CLUB_OK] },
  decorators: [
    (Story) => (
      <div className="p-6 bg-bg-page min-h-screen">
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof MigrationVerifyTable>

/** Club « tout cohérent » : 3 métriques, 3 ✓. */
export const Coherent: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // 3 lignes, toutes marquées data-ok=true.
    const rows = canvas.getAllByTestId('migration-verify-row')
    await expect(rows).toHaveLength(3)
    for (const r of rows) await expect(r).toHaveAttribute('data-ok', 'true')
    // Bandeau « tout cohérent » + 3 badges ✓.
    await expect(canvas.getByText('Toutes les métriques sont cohérentes.')).toBeInTheDocument()
    await expect(canvas.getAllByText('Cohérent')).toHaveLength(3)
    await expect(canvas.queryByText('Écart détecté')).toBeNull()
    // Solde espèces formaté FR (NBSP + €).
    await expect(canvas.getAllByText(/12\s?540,50\s?€/).length).toBeGreaterThan(0)
  },
}

/** Club avec écarts : ✓ et ✗ coexistent ; deltas non-nuls signalés. */
export const AvecEcarts: Story = {
  args: { clubs: [CLUB_MISMATCH] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // 2 écarts détectés (espèces + transactions).
    await expect(canvas.getByText('2 écarts détectés à investiguer.')).toBeInTheDocument()
    await expect(canvas.getAllByText('Écart détecté')).toHaveLength(2)
    await expect(canvas.getByText('Cohérent')).toBeInTheDocument()
    // Le delta du compteur transactions porte un signe explicite (-3).
    await expect(canvas.getByText('-3')).toBeInTheDocument()
  },
}

/** Multi-clubs (vue network admin) : un club cohérent + un club avec écarts. */
export const MultiClubs: Story = {
  args: { clubs: [CLUB_OK, CLUB_MISMATCH] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getAllByTestId('migration-verify-club')).toHaveLength(2)
    await expect(canvas.getByText('Evolve Capital')).toBeInTheDocument()
    await expect(canvas.getByText('Cercle Lyonnais')).toBeInTheDocument()
  },
}

/** État vide : aucune donnée à comparer. */
export const Empty: Story = {
  args: { clubs: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('Aucune donnée à comparer')).toBeInTheDocument()
  },
}

/** État d'erreur : chargement KO. */
export const Erreur: Story = {
  args: { clubs: [], isError: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('Vérification indisponible')).toBeInTheDocument()
  },
}

import type { Meta, StoryObj } from '@storybook/react'
import { expect, fn, userEvent, within } from 'storybook/test'
import { NetworkClubsTable, type NetworkClubRow } from './NetworkClubsTable'

// `now` figé → temps relatif déterministe dans les stories et leurs play functions.
const NOW = new Date('2026-06-18T12:00:00Z')

const CLUBS: NetworkClubRow[] = [
  {
    id: 'evolve',
    name: 'Evolve Capital',
    slug: 'evolve-capital',
    activeMembersCount: 18,
    aggregatedValuation: 642_188.42,
    lastSyncedAt: '2026-06-18T10:30:00Z', // il y a ~1 h → ok (vert)
    createdAt: '2024-03-12T08:00:00Z',
    matrixConnected: true,
  },
  {
    id: 'lyon',
    name: 'Cercle Lyonnais',
    slug: 'cercle-lyonnais',
    activeMembersCount: 11,
    aggregatedValuation: 128_400,
    lastSyncedAt: '2026-06-16T09:00:00Z', // il y a > 24 h → stale (ambre)
    createdAt: '2025-01-20T08:00:00Z',
    matrixConnected: true,
  },
  {
    // Club fraîchement créé : matrice « non connectée », jamais synchronisé, valo « — ».
    id: 'nouveau',
    name: 'Nouveau Club',
    slug: 'nouveau-club',
    activeMembersCount: 0,
    aggregatedValuation: null,
    lastSyncedAt: null,
    createdAt: '2026-06-10T08:00:00Z',
    matrixConnected: false,
  },
]

const meta: Meta<typeof NetworkClubsTable> = {
  title: 'Organisms/NetworkClubsTable',
  component: NetworkClubsTable,
  tags: ['autodocs'],
  args: { clubs: CLUBS, now: NOW, onView: fn(), onSync: fn() },
  decorators: [
    (Story) => (
      <div className="p-6 bg-bg-page min-h-screen">
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof NetworkClubsTable>

/** État normal : un club à jour, un en retard, un club neuf non connecté. */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getAllByTestId('network-club-row')).toHaveLength(3)

    // Valo formatée FR + valo absente rendue « — » explicité (Nouveau Club).
    await expect(canvas.getByText('Valorisation indisponible')).toBeInTheDocument()
    // Badge matrice : connectée + non connectée présents.
    await expect(canvas.getAllByText('Connectée')).toHaveLength(2)
    await expect(canvas.getByText('Non connectée')).toBeInTheDocument()

    // Action « Voir » remonte le club.
    await userEvent.click(canvas.getByRole('button', { name: /Voir le club Evolve Capital/i }))
    await expect(args.onView).toHaveBeenCalledWith(expect.objectContaining({ id: 'evolve' }))

    // Action « Synchroniser » remonte le club.
    await userEvent.click(
      canvas.getByRole('button', { name: /Synchroniser le club Cercle Lyonnais/i })
    )
    await expect(args.onSync).toHaveBeenCalledWith(expect.objectContaining({ id: 'lyon' }))
  },
}

/** Club neuf isolé : non connectée · jamais synchronisé · valo « — ». */
export const ClubNeuf: Story = {
  args: { clubs: [CLUBS[2]!] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('Non connectée')).toBeInTheDocument()
    await expect(canvas.getByText('Jamais synchronisé')).toBeInTheDocument()
    await expect(canvas.getByText('Valorisation indisponible')).toBeInTheDocument()
    // Statut « Jamais » exposé à l'AT (sr-only).
    await expect(canvas.getByText('Jamais')).toBeInTheDocument()
  },
}

/** État vide : aucun club → CTA d'amorçage. */
export const Empty: Story = {
  args: { clubs: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('Aucun club')).toBeInTheDocument()
    await expect(
      canvas.getByText('Ajoute un premier club pour démarrer le réseau.')
    ).toBeInTheDocument()
  },
}

/** État chargement : skeletons. */
export const Loading: Story = {
  args: { clubs: [], isLoading: true },
}

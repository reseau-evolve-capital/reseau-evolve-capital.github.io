import type { Meta, StoryObj } from '@storybook/react'
import { ContributionStatusCard } from './ContributionStatusCard'

const meta: Meta<typeof ContributionStatusCard> = {
  title: 'Molecules/ContributionStatusCard',
  component: ContributionStatusCard,
  parameters: { layout: 'centered' },
}
export default meta
type Story = StoryObj<typeof ContributionStatusCard>

/** À jour — le membre a couvert ses cotisations jusqu'au mois en cours. */
export const AJour: Story = {
  args: {
    status: 'ok',
    statusLabel: 'À jour',
    message: 'Tu es à jour de tes cotisations. Continue comme ça 💪',
  },
}

/** En retard — au moins un mois (jusqu'au mois courant) n'est pas couvert. Carte mise en avant. */
export const EnRetard: Story = {
  args: {
    status: 'late',
    statusLabel: 'En retard',
    message: 'Il te manque des cotisations pour être à jour. Régularise pour continuer à investir.',
    amountDueLabel: '150,00 €',
  },
}

/** En attente — cotisation du mois pas encore enregistrée (pas forcément en retard). */
export const EnAttente: Story = {
  args: {
    status: 'pending',
    statusLabel: 'En attente',
    message: 'Ta cotisation du mois est en cours de traitement.',
    amountDueLabel: '50,00 €',
  },
}

/** Exempté — membre dispensé de cotisation. */
export const Exempte: Story = {
  args: {
    status: 'exempt',
    statusLabel: 'Exempté',
    message: 'Tu es exempté de cotisation pour le moment.',
  },
}

/** Compact V2 — en attente : header 1 ligne, badge pill WARNING (arbitrage maquette V2). */
export const CompactEnAttente: Story = {
  args: {
    variant: 'compact',
    status: 'pending',
    title: 'Cotisation',
    statusLabel: 'En attente',
    message: 'Ta cotisation du mois est en cours de traitement.',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 360 }}>
        <Story />
      </div>
    ),
  ],
}

/** Compact V2 — à jour. */
export const CompactAJour: Story = {
  args: {
    variant: 'compact',
    status: 'ok',
    title: 'Cotisation',
    statusLabel: 'À jour',
    message: 'Tu es à jour de tes cotisations.',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 360 }}>
        <Story />
      </div>
    ),
  ],
}

/** Compact V2 — en retard (montant dû rappelé). */
export const CompactEnRetard: Story = {
  args: {
    variant: 'compact',
    status: 'late',
    title: 'Cotisation',
    statusLabel: 'En retard',
    message: 'Régularise pour continuer à investir.',
    amountDueLabel: '150,00 €',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 360 }}>
        <Story />
      </div>
    ),
  ],
}

/** Compact V2 — variante sombre (data-theme="dark"). */
export const CompactDark: Story = {
  args: {
    variant: 'compact',
    status: 'pending',
    title: 'Cotisation',
    statusLabel: 'En attente',
    message: 'Ta cotisation du mois est en cours de traitement.',
  },
  decorators: [
    (Story) => (
      <div
        data-theme="dark"
        style={{ width: 360, padding: 16, background: 'var(--color-bg-page)', borderRadius: 12 }}
      >
        <Story />
      </div>
    ),
  ],
}

/** Les 4 états côte à côte (revue design). */
export const TousLesEtats: Story = {
  render: () => (
    <div className="grid w-[680px] grid-cols-2 gap-4">
      <ContributionStatusCard status="ok" statusLabel="À jour" message="Tu es à jour." />
      <ContributionStatusCard
        status="late"
        statusLabel="En retard"
        message="Régularise pour rester à jour."
        amountDueLabel="150,00 €"
      />
      <ContributionStatusCard
        status="pending"
        statusLabel="En attente"
        message="Cotisation du mois en cours de traitement."
        amountDueLabel="50,00 €"
      />
      <ContributionStatusCard
        status="exempt"
        statusLabel="Exempté"
        message="Tu es exempté pour le moment."
      />
    </div>
  ),
}

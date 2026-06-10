import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react'

import { ConsentBanner } from './ConsentBanner'

// La bannière est `position: fixed` → on simule une page sous-jacente pour la voir en contexte
// (et pour que les captures QA ressemblent au rendu réel : carte non bloquante par-dessus le contenu).
const PageBackdrop = (Story: () => React.ReactNode) => (
  <div className="min-h-[520px] w-full bg-bg-page p-8">
    <div className="mx-auto max-w-[860px]">
      <div className="mb-4 h-3 w-40 rounded bg-border" />
      <div className="mb-6 h-8 w-72 rounded bg-border-strong" />
      <div className="space-y-3">
        <div className="h-3 w-full rounded bg-border" />
        <div className="h-3 w-5/6 rounded bg-border" />
        <div className="h-3 w-4/6 rounded bg-border" />
      </div>
    </div>
    <Story />
  </div>
)

const meta = {
  title: 'Organisms/ConsentBanner',
  component: ConsentBanner,
  parameters: { layout: 'fullscreen' },
  decorators: [PageBackdrop],
  args: {
    onAcceptAll: () => console.log('accept_all'),
    onRejectAll: () => console.log('reject_all'),
    onSave: (c) => console.log('save', c),
  },
} satisfies Meta<typeof ConsentBanner>

export default meta
type Story = StoryObj<typeof meta>

/** Défaut : carte compacte ancrée en bas à gauche (état première visite). */
export const CompactGauche: Story = {
  args: { variant: 'compact', side: 'gauche' },
}

/** Carte compacte ancrée à droite. */
export const CompactDroite: Story = {
  args: { variant: 'compact', side: 'droite' },
}

/** Carte compacte, panneau granulaire ouvert (Personnaliser). */
export const CompactGranulaire: Story = {
  args: { variant: 'compact', side: 'gauche', defaultExpanded: true },
}

/** Barre basse pleine largeur (état première visite). */
export const Bar: Story = {
  args: { variant: 'bar' },
}

/** Barre basse, panneau granulaire ouvert (la barre s'étend sur place). */
export const BarGranulaire: Story = {
  args: { variant: 'bar', defaultExpanded: true },
}

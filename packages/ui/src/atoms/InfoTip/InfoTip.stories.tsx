import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect, waitFor } from 'storybook/test'
import { InfoTip } from './InfoTip'

const meta: Meta<typeof InfoTip> = {
  title: 'Atoms/InfoTip',
  component: InfoTip,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ padding: 64, background: 'var(--color-bg-page)' }}>
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof InfoTip>

const CONTENT =
  'Capacité restante d’investissement sur l’année : le plafond annuel du club moins ce que tu as déjà versé cette année.'
const LABEL = 'En savoir plus sur la capacité d’investissement'

/** Ouverture au focus clavier (:focus-visible) — contenu visible, fermeture Échap. */
export const FocusClavier: Story = {
  args: { content: CONTENT, 'aria-label': LABEL },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole('button', { name: LABEL })
    await userEvent.tab()
    expect(trigger).toHaveFocus()
    // La bulle est portalisée hors du canvas → assertion sur le document.
    await waitFor(() => expect(within(document.body).getByText(CONTENT)).toBeVisible())
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(within(document.body).queryByText(CONTENT)).not.toBeInTheDocument())
  },
}

/** Ouverture au clic / tap (toggle) — chemin mobile (le hover n'existe pas en tactile). */
export const ClicTap: Story = {
  args: { content: CONTENT, 'aria-label': LABEL },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole('button', { name: LABEL })
    await userEvent.click(trigger)
    await waitFor(() => expect(within(document.body).getByText(CONTENT)).toBeVisible())
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  },
}

/** Dans le contexte d'un label de métrique (taille réelle d'usage). */
export const DansUnLabel: Story = {
  render: () => (
    <p
      style={{ display: 'flex', alignItems: 'center', gap: 4 }}
      className="font-mono text-[10px] uppercase tracking-[0.10em] text-text-ter"
    >
      Capacité
      <InfoTip content={CONTENT} aria-label={LABEL} />
    </p>
  ),
}

/** Variante sombre (data-theme="dark"). */
export const Dark: Story = {
  args: { content: CONTENT, 'aria-label': LABEL },
  decorators: [
    (Story) => (
      <div data-theme="dark" style={{ padding: 64, background: 'var(--color-bg-page)' }}>
        <Story />
      </div>
    ),
  ],
}
